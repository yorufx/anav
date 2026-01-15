use axum::Json;
use axum::body::Body;
use axum::extract::{Multipart, Path, Query, State};
use axum::http::StatusCode;
use axum::response::Response;
use axum_extra::extract::CookieJar;
use image::{GenericImageView, ImageFormat};
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::bookmark::{BackgroundImage, BookmarkProfile, ImageOrientation};
use crate::error::{Error, Result};
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct OptionalProfileQuery {
    pub profile: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ProfileQuery {
    pub profile: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

/// 登录接口
pub async fn login(
    State(app_state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Response> {
    let storage = &mut *app_state.storage.lock().await;
    let config = &storage.config;

    if !config.auth.enabled {
        // Authentication is not enabled.
        return Ok(Response::builder()
            .status(StatusCode::ACCEPTED)
            .body(Body::empty())
            .unwrap());
    }

    // Validate username and password.
    if payload.username != config.auth.username || payload.password != config.auth.password {
        return Err(Error::InvalidCredentials);
    }

    // Create session.
    let session_id = storage.sessions.create_session(config);

    // Set cookie.
    let cookie = axum_extra::extract::cookie::Cookie::build(("session_id", session_id))
        .path("/")
        .http_only(true)
        .same_site(axum_extra::extract::cookie::SameSite::Lax)
        .max_age(time::Duration::seconds(config.auth.session_duration_secs))
        .build();

    let response = Response::builder()
        .header("Set-Cookie", cookie.to_string())
        .status(StatusCode::OK)
        .body(Body::empty())
        .unwrap();

    Ok(response)
}

/// 登出接口
pub async fn logout(State(app_state): State<AppState>, jar: CookieJar) -> Result<Response> {
    if let Some(session_id) = jar.get("session_id") {
        app_state
            .storage
            .lock()
            .await
            .sessions
            .delete_session(session_id.value());
    }

    let response = Response::builder()
        .status(StatusCode::OK)
        .body(Body::empty())
        .unwrap();

    Ok(response)
}

pub async fn get_profile(
    State(app_state): State<AppState>,
    Query(params): Query<OptionalProfileQuery>,
) -> Result<Json<BookmarkProfile>> {
    let mut storage = app_state.storage.lock().await;
    let profile = if let Some(name) = params.profile.as_deref()
        && let Some(profile) = storage.get_profile_mut(name)
    {
        profile
    } else {
        storage.get_default_profile_mut().await
    };

    // Ensure the profile has a version (for backward compatibility with old data)
    let needs_save = profile.version.is_none();
    profile.ensure_version();

    let result = profile.clone();

    // Save if we generated a new version for old data
    if needs_save {
        storage.save_profiles().await?;
    }

    Ok(Json(result))
}

pub async fn create_profile(
    State(app_state): State<AppState>,
    Json(payload): Json<BookmarkProfile>,
) -> Result<()> {
    let mut storage = app_state.storage.lock().await;
    if storage.profiles.iter().any(|p| p.name == payload.name) {
        return Err(Error::ProfileAlreadyExists);
    }
    storage.profiles.push(payload);
    storage.save_profiles().await?;
    Ok(())
}

pub async fn delete_profile(
    State(app_state): State<AppState>,
    Query(params): Query<ProfileQuery>,
) -> Result<()> {
    let mut storage = app_state.storage.lock().await;
    if storage.profiles.len() <= 1 {
        return Err(Error::CannotDeleteLastProfile);
    }
    let profile_name = params.profile;
    storage.profiles.retain(|p| p.name != profile_name);
    storage.save_profiles().await?;
    Ok(())
}

pub async fn update_profile(
    State(app_state): State<AppState>,
    Json(mut payload): Json<BookmarkProfile>,
) -> Result<()> {
    let mut storage = app_state.storage.lock().await;
    if let Some(profile) = storage.get_profile_mut(&payload.name) {
        // Verify version consistency (skip if client version is None for backward compatibility)
        if let Some(client_version) = &payload.version
            && let Some(server_version) = &profile.version
            && client_version != server_version
        {
            return Err(Error::VersionConflict);
        }

        // Preserve background_images - they should be managed via dedicated APIs
        payload.background_images = profile.background_images.clone();

        // Regenerate version for the update
        payload.regenerate_version();
        *profile = payload;
    }
    storage.save_profiles().await?;
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct RenameProfileRequest {
    pub name: String,
    pub new_name: String,
}

pub async fn rename_profile(
    State(app_state): State<AppState>,
    Json(payload): Json<RenameProfileRequest>,
) -> Result<Json<VersionResponse>> {
    let mut storage = app_state.storage.lock().await;
    if storage.profiles.iter().any(|p| p.name == payload.new_name) {
        return Err(Error::ProfileAlreadyExists);
    }
    let new_version = if let Some(profile) = storage.get_profile_mut(&payload.name) {
        profile.name = payload.new_name;
        profile.regenerate_version();
        profile.version.clone()
    } else {
        None
    };
    storage.save_profiles().await?;
    Ok(Json(VersionResponse { version: new_version }))
}

pub async fn get_all_profile_names(State(app_state): State<AppState>) -> Result<Json<Vec<String>>> {
    let storage = app_state.storage.lock().await;
    Ok(Json(
        storage.profiles.iter().map(|p| p.name.clone()).collect(),
    ))
}

pub async fn sort_profiles(
    State(app_state): State<AppState>,
    Json(payload): Json<Vec<String>>,
) -> Result<()> {
    let names_order = payload;
    let mut storage = app_state.storage.lock().await;
    if names_order.len() != storage.profiles.len() {
        return Err(Error::InvalidProfileOrder);
    }
    let mut new_profiles = Vec::new();
    for name in names_order {
        if let Some(profile) = storage.get_profile(&name) {
            new_profiles.push(profile.clone());
        } else {
            return Err(Error::InvalidProfileOrder);
        }
    }
    storage.profiles = new_profiles;
    storage.save_profiles().await?;
    Ok(())
}

pub const ASSETS_DIR: &str = "./config/assets";
pub const ICON_DIR: &str = "./config/assets/icons";
pub const BACKGROUND_DIR: &str = "./config/assets/backgrounds";

#[derive(Debug, Deserialize)]
pub struct FetchFaviconQuery {
    pub url: String,
}

#[derive(Debug, Serialize)]
pub struct FaviconResult {
    pub icons: Vec<FaviconIcon>,
}

#[derive(Debug, Serialize)]
pub struct FaviconIcon {
    pub url: String,
    pub data: String, // base64 encoded
    pub content_type: String,
}

/// 从 URL 获取 favicon
pub async fn fetch_favicon(Query(query): Query<FetchFaviconQuery>) -> Result<Json<FaviconResult>> {
    let url = &query.url;
    let base_url = match url::Url::parse(url) {
        Ok(parsed) => format!("{}://{}", parsed.scheme(), parsed.host_str().unwrap_or("")),
        Err(_) => return Err(Error::BadRequest),
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()
        .map_err(|_| Error::BadRequest)?;

    let mut icon_urls: Vec<String> = Vec::new();

    // 1. 尝试解析 HTML 页面获取 link 标签中的图标
    if let Ok(response) = client.get(url).send().await
        && let Ok(html) = response.text().await
    {
        let document = Html::parse_document(&html);

        // 查找所有可能的图标链接
        let selectors = [
            r#"link[rel="icon"]"#,
            r#"link[rel="shortcut icon"]"#,
            r#"link[rel="apple-touch-icon"]"#,
            r#"link[rel="apple-touch-icon-precomposed"]"#,
            r#"link[rel="mask-icon"]"#,
        ];

        for selector_str in selectors {
            if let Ok(selector) = Selector::parse(selector_str) {
                for element in document.select(&selector) {
                    if let Some(href) = element.value().attr("href") {
                        let icon_url = resolve_url(&base_url, url, href);
                        if !icon_urls.contains(&icon_url) {
                            icon_urls.push(icon_url);
                        }
                    }
                }
            }
        }
    }

    // 2. 添加常见的 favicon 路径
    let common_paths = [
        "/favicon.ico",
        "/favicon.png",
        "/favicon.svg",
        "/apple-touch-icon.png",
        "/apple-touch-icon-precomposed.png",
        "/favicon-32x32.png",
        "/favicon-16x16.png",
    ];

    for path in common_paths {
        let icon_url = format!("{base_url}{path}");
        if !icon_urls.contains(&icon_url) {
            icon_urls.push(icon_url);
        }
    }

    // 3. 尝试获取每个图标
    let mut icons: Vec<FaviconIcon> = Vec::new();

    for icon_url in icon_urls {
        if let Ok(response) = client.get(&icon_url).send().await
            && response.status().is_success()
        {
            let content_type = response
                .headers()
                .get("content-type")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("image/x-icon")
                .to_string();

            // 检查是否是图片类型
            if (content_type.starts_with("image/") || content_type.contains("icon"))
                && let Ok(bytes) = response.bytes().await
            {
                // 验证是否是有效的图片
                if is_valid_image(&bytes) {
                    use base64::Engine;
                    let data = base64::engine::general_purpose::STANDARD.encode(&bytes);
                    icons.push(FaviconIcon {
                        url: icon_url,
                        data,
                        content_type,
                    });
                }
            }
        }
    }

    Ok(Json(FaviconResult { icons }))
}

/// 解析相对 URL 为绝对 URL
fn resolve_url(base_url: &str, page_url: &str, href: &str) -> String {
    if href.starts_with("http://") || href.starts_with("https://") {
        href.to_string()
    } else if href.starts_with("//") {
        format!("https:{href}")
    } else if href.starts_with('/') {
        format!("{base_url}{href}")
    } else {
        // 相对路径
        if let Ok(base) = url::Url::parse(page_url)
            && let Ok(resolved) = base.join(href)
        {
            return resolved.to_string();
        }
        format!("{base_url}/{href}")
    }
}

/// 检查字节数据是否是有效的图片
fn is_valid_image(bytes: &[u8]) -> bool {
    // 检查常见图片格式的魔数
    if bytes.len() < 4 {
        return false;
    }

    // PNG
    if bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
        return true;
    }
    // JPEG
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        return true;
    }
    // GIF
    if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        return true;
    }
    // ICO
    if bytes.starts_with(&[0x00, 0x00, 0x01, 0x00]) {
        return true;
    }
    // WebP
    if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        return true;
    }
    // SVG (text-based, check for xml or svg tag)
    if let Ok(text) = std::str::from_utf8(&bytes[..bytes.len().min(1000)]) {
        let text_lower = text.to_lowercase();
        if text_lower.contains("<svg") || text_lower.contains("<?xml") {
            return true;
        }
    }
    // BMP
    if bytes.starts_with(b"BM") {
        return true;
    }

    false
}

pub async fn set_icon(
    State(app_state): State<AppState>,
    Path(id): Path<Uuid>,
    mut multipart: Multipart,
) -> Result<()> {
    let mut storage = app_state.storage.lock().await;
    let Some(profile) = storage.profiles.iter_mut().find_map(|p| {
        p.bookmarks
            .iter_mut()
            .find_map(|b| if b.id == id { Some(b) } else { None })
    }) else {
        return Err(Error::BookmarkNotFound);
    };

    tokio::fs::create_dir_all(ICON_DIR).await?;

    let mut filename = None;
    let mut file_content = None;

    while let Some(field) = multipart.next_field().await? {
        let field_name = field.name().unwrap_or("");
        if field_name == "icon" {
            if let Some(name) = field.file_name() {
                filename = Some(name.to_string());
            }

            let data = field.bytes().await?;
            file_content = Some(data);
            break;
        }
    }

    let (Some(filename), Some(file_content)) = (filename, file_content) else {
        return Err(Error::BadRequest);
    };
    let format = if let Some(ext) = filename.split('.').next_back()
        && let Some(format) = ImageFormat::from_extension(ext)
    {
        format
    } else if let Ok(format) = image::guess_format(&file_content) {
        format
    } else {
        return Err(Error::InvalidImageFormat);
    };

    let ext = format.extensions_str()[0];
    let icon_filename = format!("{id}.{ext}");
    let icon_path = format!("{ICON_DIR}/{icon_filename}");

    if let Some(old_icon_filename) = profile.icon.as_deref()
        && old_icon_filename != icon_filename
    {
        let old_icon_path = format!("{ICON_DIR}/{old_icon_filename}");
        let _ = tokio::fs::remove_file(old_icon_path).await;
    }
    profile.icon = Some(icon_filename);
    tokio::fs::write(icon_path, file_content).await?;

    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct UploadBackgroundImageQuery {
    pub profile: String,
}

#[derive(Debug, Serialize)]
pub struct UploadBackgroundImageResponse {
    pub image: BackgroundImage,
    pub version: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct VersionResponse {
    pub version: Option<String>,
}

/// 上传背景图
pub async fn upload_background_image(
    State(app_state): State<AppState>,
    Query(params): Query<UploadBackgroundImageQuery>,
    mut multipart: Multipart,
) -> Result<Json<UploadBackgroundImageResponse>> {
    let mut storage = app_state.storage.lock().await;
    let Some(profile) = storage.get_profile_mut(&params.profile) else {
        return Err(Error::ProfileNotFound);
    };

    tokio::fs::create_dir_all(BACKGROUND_DIR).await?;

    let mut filename = None;
    let mut file_content = None;

    while let Some(field) = multipart.next_field().await? {
        let field_name = field.name().unwrap_or("");
        if field_name == "image" {
            if let Some(name) = field.file_name() {
                filename = Some(name.to_string());
            }

            let data = field.bytes().await?;
            file_content = Some(data);
            break;
        }
    }

    let (Some(filename), Some(file_content)) = (filename, file_content) else {
        return Err(Error::BadRequest);
    };

    // 验证图片格式
    let format = if let Some(ext) = filename.split('.').next_back()
        && let Some(format) = ImageFormat::from_extension(ext)
    {
        format
    } else if let Ok(format) = image::guess_format(&file_content) {
        format
    } else {
        return Err(Error::InvalidImageFormat);
    };

    // 检测图片尺寸以自动判断横竖图
    let img = image::load_from_memory(&file_content).map_err(|_| Error::InvalidImageFormat)?;
    let (width, height) = img.dimensions();
    let orientation = if width > height {
        ImageOrientation::Landscape
    } else {
        ImageOrientation::Portrait
    };

    // 生成唯一 ID 和文件名
    let id = Uuid::new_v4();
    let ext = format.extensions_str()[0];
    let bg_filename = format!("{id}.{ext}");
    let bg_path = format!("{BACKGROUND_DIR}/{bg_filename}");

    // 保存文件
    tokio::fs::write(&bg_path, file_content).await?;

    // 创建背景图记录
    let background_image = BackgroundImage {
        id,
        filename: bg_filename,
        orientation,
    };

    // 添加到 profile
    profile.background_images.push(background_image.clone());
    profile.regenerate_version();
    let new_version = profile.version.clone();

    // Persist changes to disk
    storage.save_profiles().await?;

    Ok(Json(UploadBackgroundImageResponse {
        image: background_image,
        version: new_version,
    }))
}

#[derive(Debug, Deserialize)]
pub struct DeleteBackgroundImageQuery {
    pub profile: String,
    pub id: Uuid,
}

/// 删除背景图
pub async fn delete_background_image(
    State(app_state): State<AppState>,
    Query(params): Query<DeleteBackgroundImageQuery>,
) -> Result<Json<VersionResponse>> {
    let mut storage = app_state.storage.lock().await;
    let Some(profile) = storage.get_profile_mut(&params.profile) else {
        return Err(Error::ProfileNotFound);
    };

    // 查找并删除背景图
    if let Some(index) = profile
        .background_images
        .iter()
        .position(|bg| bg.id == params.id)
    {
        let bg = profile.background_images.remove(index);
        profile.regenerate_version();
        let new_version = profile.version.clone();

        // 删除文件
        let bg_path = format!("{}/{}", BACKGROUND_DIR, bg.filename);
        let _ = tokio::fs::remove_file(bg_path).await;

        // Persist changes to disk
        storage.save_profiles().await?;

        Ok(Json(VersionResponse { version: new_version }))
    } else {
        Err(Error::BadRequest)
    }
}

#[derive(Debug, Serialize)]
pub struct BackgroundImageListResponse {
    pub images: Vec<BackgroundImageInfo>,
}

#[derive(Debug, Serialize)]
pub struct BackgroundImageInfo {
    pub id: Uuid,
    pub filename: String,
    pub orientation: ImageOrientation,
    pub url: String, // 相对 URL，前端可以通过 /images/backgrounds/{filename} 访问
}

/// 获取背景图列表
pub async fn get_background_images(
    State(app_state): State<AppState>,
    Query(params): Query<ProfileQuery>,
) -> Result<Json<BackgroundImageListResponse>> {
    let storage = app_state.storage.lock().await;
    let Some(profile) = storage.get_profile(&params.profile) else {
        return Err(Error::ProfileNotFound);
    };

    let images: Vec<BackgroundImageInfo> = profile
        .background_images
        .iter()
        .map(|bg| BackgroundImageInfo {
            id: bg.id,
            filename: bg.filename.clone(),
            orientation: bg.orientation.clone(),
            url: format!("/images/backgrounds/{}", bg.filename),
        })
        .collect();

    Ok(Json(BackgroundImageListResponse { images }))
}

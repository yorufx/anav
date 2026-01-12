mod api;
mod bookmark;
mod config;
mod env;
pub mod error;
mod middleware;
mod session;
mod state;

use anyhow::Result;
use axum::extract::DefaultBodyLimit;
use axum::http::{HeaderName, Method};
use axum::routing::{delete, get, post};
use axum::{Router, middleware as axum_middleware};
use dotenvy::dotenv;
use tokio::signal;
use tower_http::cors::{AllowCredentials, AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
use tower_http::services::ServeDir;
use tower_http::trace::TraceLayer;
use tracing::Level;

use crate::api::{ASSETS_DIR, update_profile};
use crate::env::PORT;
use crate::middleware::auth::auth_middleware;
use crate::state::AppState;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();
    tracing_subscriber::fmt()
        .with_max_level(if cfg!(debug_assertions) {
            Level::DEBUG
        } else {
            Level::INFO
        })
        .init();

    let app_state = AppState::init().await?;

    let protected_routes = Router::new()
        .route(
            "/api/profile",
            get(api::get_profile)
                .post(api::create_profile)
                .delete(api::delete_profile)
                .put(update_profile),
        )
        .route("/api/profile/rename", post(api::rename_profile))
        .route("/api/profile/names", get(api::get_all_profile_names))
        .route("/api/profile/sort", post(api::sort_profiles))
        .route(
            "/api/images/icon/{id}",
            post(api::set_icon)
                // 增加图标上传大小限制到 10MB
                .layer(DefaultBodyLimit::max(10 * 1024 * 1024)),
        )
        .route("/api/fetch-favicon", get(api::fetch_favicon))
        .route(
            "/api/background-image",
            post(api::upload_background_image)
                .get(api::get_background_images)
                // 增加上传大小限制到 50MB
                .layer(DefaultBodyLimit::max(50 * 1024 * 1024)),
        )
        .route(
            "/api/background-image/delete",
            delete(api::delete_background_image),
        )
        // For icons and background images.
        .nest_service("/images", ServeDir::new(ASSETS_DIR))
        .layer(axum_middleware::from_fn_with_state(
            app_state.clone(),
            auth_middleware,
        ));

    let public_routes = Router::new()
        .route("/api/login", post(api::login))
        .route("/api/logout", post(api::logout));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .fallback_service(ServeDir::new("./dist"))
        .layer(TraceLayer::new_for_http())
        .layer(tower_http::catch_panic::CatchPanicLayer::new())
        .layer(if cfg!(debug_assertions) {
            // For development
            CorsLayer::new()
                .allow_origin(AllowOrigin::exact("http://localhost:3000".parse().unwrap()))
                .allow_methods(AllowMethods::list([
                    Method::GET,
                    Method::POST,
                    Method::PUT,
                    Method::DELETE,
                    Method::PATCH,
                    Method::OPTIONS,
                ]))
                .allow_headers(AllowHeaders::list([HeaderName::from_static(
                    "content-type",
                )]))
                .allow_credentials(AllowCredentials::yes())
                .max_age(std::time::Duration::from_secs(3600))
        } else {
            // No CORS for production
            CorsLayer::new()
        })
        .with_state(app_state.clone());

    tokio::spawn(tick_save(app_state.clone()));

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", *PORT)).await?;
    tracing::info!("🚀 Server running on http://0.0.0.0:{}", *PORT);

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal(app_state))
        .await?;

    Ok(())
}

async fn tick_save(state: AppState) {
    loop {
        tokio::time::sleep(std::time::Duration::from_secs(5 * 60)).await;
        let storage = state.storage.lock().await;
        let _ = storage.save_sessions().await;
        let _ = storage.save_profiles().await;
    }
}

async fn shutdown_signal(state: AppState) {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            tracing::info!("Ctrl+C received, shutting down...");
            let storage = state.storage.lock().await;
            let _ = storage.save_sessions().await;
            let _ = storage.save_profiles().await;
        },
        _ = terminate => {
            tracing::info!("Terminate signal received, shutting down...");
            let storage = state.storage.lock().await;
            let _ = storage.save_sessions().await;
            let _ = storage.save_profiles().await;
        },
    }
}

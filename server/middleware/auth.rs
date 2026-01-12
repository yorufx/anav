use axum::extract::{Request, State};
use axum::http::{HeaderValue, StatusCode};
use axum::middleware::Next;
use axum::response::Response;
use axum_extra::extract::CookieJar;

use crate::state::AppState;

/// 认证中间件
pub async fn auth_middleware(
    State(app_state): State<AppState>,
    jar: CookieJar,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let refresh_cookie;
    let expires_in;

    {
        let storage = &mut *app_state.storage.lock().await;
        expires_in = storage.config.auth.session_duration_secs;

        // If authentication is not enabled, pass through.
        if storage.config.auth.enabled {
            // Get session_id from cookie.
            let session_id = match jar.get("session_id") {
                Some(cookie) => cookie.value(),
                None => return Err(StatusCode::UNAUTHORIZED),
            };

            // Validate session.
            if !storage
                .sessions
                .validate_session(session_id, &storage.config)
            {
                return Err(StatusCode::UNAUTHORIZED);
            }

            refresh_cookie = Some(session_id.to_string());
        } else {
            refresh_cookie = None;
        }
    }

    let mut response = next.run(request).await;

    if let Some(session_id) = refresh_cookie {
        let cookie = axum_extra::extract::cookie::Cookie::build(("session_id", session_id))
            .path("/")
            .http_only(true)
            .same_site(axum_extra::extract::cookie::SameSite::Lax)
            .max_age(time::Duration::seconds(expires_in))
            .build();
        response.headers_mut().insert(
            "Set-Cookie",
            HeaderValue::from_str(&cookie.to_string()).unwrap(),
        );
    }

    Ok(response)
}

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Bookmark not found")]
    BookmarkNotFound,
    #[error("Profile not found")]
    ProfileNotFound,
    #[error("Invalid credentials")]
    InvalidCredentials,
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Authentication required")]
    AuthRequired,

    #[error("Cannot delete last profile")]
    CannotDeleteLastProfile,
    #[error("Profile already exists")]
    ProfileAlreadyExists,
    #[error("Invalid profile order")]
    InvalidProfileOrder,
    #[error("Invalid image format")]
    InvalidImageFormat,

    #[error("Bad request")]
    BadRequest,

    #[error(transparent)]
    IO(#[from] std::io::Error),
    #[error(transparent)]
    Image(#[from] image::ImageError),
    #[error(transparent)]
    Multipart(#[from] axum::extract::multipart::MultipartError),

    #[error(transparent)]
    AnyError(#[from] anyhow::Error),
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        let status_code = match self {
            Error::BookmarkNotFound => StatusCode::NOT_FOUND,
            Error::ProfileNotFound => StatusCode::NOT_FOUND,

            Error::InvalidCredentials => StatusCode::UNAUTHORIZED,
            Error::Unauthorized => StatusCode::UNAUTHORIZED,
            Error::AuthRequired => StatusCode::UNAUTHORIZED,

            Error::BadRequest => StatusCode::BAD_REQUEST,
            Error::CannotDeleteLastProfile => StatusCode::BAD_REQUEST,
            Error::ProfileAlreadyExists => StatusCode::BAD_REQUEST,
            Error::InvalidProfileOrder => StatusCode::BAD_REQUEST,
            Error::InvalidImageFormat => StatusCode::BAD_REQUEST,

            _ => StatusCode::INTERNAL_SERVER_ERROR,
        };

        (status_code, self.to_string()).into_response()
    }
}

pub type Result<T> = std::result::Result<T, Error>;

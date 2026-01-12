use std::sync::LazyLock;

pub static PORT: LazyLock<u16> = LazyLock::new(|| {
    std::env::var("PORT")
        .unwrap_or_else(|_| "33989".to_string())
        .parse()
        .unwrap()
});

/// Initial username and password.
///
/// Json configuration is preferred over environment variables.
pub static USERNAME: LazyLock<String> =
    LazyLock::new(|| std::env::var("USERNAME").unwrap_or_else(|_| "admin".to_string()));

pub static PASSWORD: LazyLock<String> =
    LazyLock::new(|| std::env::var("PASSWORD").unwrap_or_else(|_| "admin".to_string()));

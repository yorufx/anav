use serde::{Deserialize, Serialize};

use crate::env::{PASSWORD, USERNAME};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
#[derive(Default)]
pub struct Config {
    pub auth: AuthConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AuthConfig {
    pub username: String,
    pub password: String,
    pub enabled: bool,
    pub session_duration_secs: i64,
}

impl Default for AuthConfig {
    fn default() -> Self {
        Self {
            username: USERNAME.to_string(),
            password: PASSWORD.to_string(),
            enabled: false,
            // 7 days
            session_duration_secs: 7 * 24 * 60 * 60,
        }
    }
}

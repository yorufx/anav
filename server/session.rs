use std::collections::HashMap;
use std::fmt::Debug;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::config::Config;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionData {
    pub session_id: String,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

#[derive(Default, Serialize, Deserialize)]
pub struct SessionStore {
    sessions: HashMap<String, SessionData>,
}

impl Debug for SessionStore {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{} sessions", self.sessions.len())
    }
}

impl SessionStore {
    pub fn cleanup_sessions(&mut self) {
        let now = Utc::now();
        self.sessions.retain(|_, session| session.expires_at > now);
    }

    /// Create a new session.
    pub fn create_session(&mut self, config: &Config) -> String {
        let session_id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let expires_at = now + chrono::Duration::seconds(config.auth.session_duration_secs);

        let session = SessionData {
            session_id: session_id.clone(),
            created_at: now,
            expires_at,
        };

        self.sessions.insert(session_id.clone(), session);

        session_id
    }

    /// Validate if the session exists and is not expired.
    pub fn validate_session(&mut self, session_id: &str, config: &Config) -> bool {
        if let Some(session) = self.sessions.get_mut(session_id) {
            let now = Utc::now();
            if session.expires_at > now {
                session.expires_at =
                    now + chrono::Duration::seconds(config.auth.session_duration_secs);
                return true;
            } else {
                self.delete_session(session_id);
                return false;
            }
        }
        false
    }

    /// Delete the session.
    pub fn delete_session(&mut self, session_id: &str) {
        self.sessions.remove(session_id);
    }
}

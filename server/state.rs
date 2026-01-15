use std::fs;
use std::path::Path;
use std::sync::Arc;

use anyhow::Result;
use tokio::sync::Mutex;

use crate::bookmark::BookmarkProfile;
use crate::config::Config;
use crate::session::SessionStore;

#[derive(Debug, Clone)]
pub struct AppState {
    pub storage: Arc<Mutex<Storage>>,
}

impl AppState {
    pub async fn init() -> Result<Self> {
        let storage = Storage::init().await?;
        Ok(Self { storage })
    }
}

#[derive(Debug)]
pub struct Storage {
    pub config: Config,
    pub profiles: Vec<BookmarkProfile>,
    pub sessions: SessionStore,
}

const CONFIG_DIR: &str = "./config";
const CONFIG_PATH: &str = "./config/config.json";
const PROFILES_PATH: &str = "./config/profiles.json";
const SESSIONS_PATH: &str = "./config/sessions.json";

impl Storage {
    async fn ensure_config_file() -> Result<()> {
        fs::create_dir_all(CONFIG_DIR)?;

        // If the config file does not exist, create it with the default config.
        if !Path::new(CONFIG_PATH).exists() {
            fs::write(
                CONFIG_PATH,
                serde_json::to_string_pretty(&Config::default())?,
            )?;
        }
        // If the profiles file does not exist, create it with the default profile.
        if !Path::new(PROFILES_PATH).exists() {
            fs::write(
                PROFILES_PATH,
                serde_json::to_string_pretty(&[BookmarkProfile::default()])?,
            )?;
        }
        // If the sessions file does not exist, create it with the default sessions.
        if !Path::new(SESSIONS_PATH).exists() {
            fs::write(
                SESSIONS_PATH,
                serde_json::to_string_pretty(&SessionStore::default())?,
            )?;
        }

        Ok(())
    }

    pub async fn init() -> Result<Arc<Mutex<Self>>> {
        Self::ensure_config_file().await?;

        let config = serde_json::from_str(&fs::read_to_string(CONFIG_PATH)?)?;
        let profiles: Vec<BookmarkProfile> =
            serde_json::from_str(&fs::read_to_string(PROFILES_PATH)?)?;
        let mut sessions: SessionStore = serde_json::from_str(&fs::read_to_string(SESSIONS_PATH)?)?;
        sessions.cleanup_sessions();

        let storage = Arc::new(Mutex::new(Self {
            profiles,
            config,
            sessions,
        }));
        Ok(storage)
    }

    pub async fn save_sessions(&self) -> Result<()> {
        fs::write(SESSIONS_PATH, serde_json::to_string_pretty(&self.sessions)?)?;
        Ok(())
    }

    pub async fn save_profiles(&self) -> Result<()> {
        fs::write(PROFILES_PATH, serde_json::to_string_pretty(&self.profiles)?)?;
        Ok(())
    }

    pub fn get_profile(&self, name: &str) -> Option<&BookmarkProfile> {
        self.profiles.iter().find(|p| p.name == name)
    }

    pub fn get_profile_mut(&mut self, name: &str) -> Option<&mut BookmarkProfile> {
        self.profiles.iter_mut().find(|p| p.name == name)
    }

    pub async fn get_default_profile_mut(&mut self) -> &mut BookmarkProfile {
        if self.profiles.is_empty() {
            self.profiles.push(BookmarkProfile::default());
            let _ = self.save_profiles().await;
        }

        &mut self.profiles[0]
    }
}

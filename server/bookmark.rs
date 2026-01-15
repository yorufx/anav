use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackgroundImage {
    pub id: Uuid,
    pub filename: String,
    pub orientation: ImageOrientation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ImageOrientation {
    Landscape, // 横图
    Portrait,  // 竖图
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bookmark {
    pub id: Uuid,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub search_title: Option<String>,
    pub url: String,
    /// Internal network domain name
    ///
    /// The intranet url is used to open the bookmark in the internal network.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub intranet_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub search_url: Option<String>,
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct BookmarkProfile {
    /// Unique identifier for the profile.
    pub name: String,
    pub bookmarks: Vec<Bookmark>,
    pub tags: Vec<String>,
    pub search_engine: String,
    /// A url for checking the intranet connection.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub intranet_check_url: Option<String>,
    /// Background images for the profile.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub background_images: Vec<BackgroundImage>,
    /// Version UUID for optimistic concurrency control.
    /// Regenerated on each modification to detect stale updates.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
}

impl Default for BookmarkProfile {
    fn default() -> Self {
        Self {
            name: "Default".to_string(),
            bookmarks: vec![],
            tags: vec![],
            search_engine: "https://www.google.com/search?q={}".to_string(),
            intranet_check_url: None,
            background_images: vec![],
            version: Some(Uuid::new_v4().to_string()),
        }
    }
}

impl BookmarkProfile {
    /// Ensure the profile has a version, generating one if missing (for backward compatibility).
    pub fn ensure_version(&mut self) {
        if self.version.is_none() {
            self.version = Some(Uuid::new_v4().to_string());
        }
    }

    /// Regenerate the version UUID. Called after any modification.
    pub fn regenerate_version(&mut self) {
        self.version = Some(Uuid::new_v4().to_string());
    }
}

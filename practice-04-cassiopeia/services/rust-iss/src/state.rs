use crate::{clients::ExternalClients, config::Settings, repo::Repositories};

#[derive(Clone)]
pub struct AppState {
    pub repo: Repositories,
    pub clients: ExternalClients,
    pub settings: Settings,
}

import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://mailflow-ndex.onrender.com'
});

// PIN verification
export const verifyPin = (pin) => API.post('/api/verify-pin', { pin });

// Accounts
export const getAccounts = () => API.get('/api/accounts');
export const getAuthUrl = () => API.get('/api/accounts/auth');
export const deleteAccount = (id) => API.delete(`/api/accounts/${id}`);
export const resetAccount = (id) => API.post(`/api/accounts/${id}/reset`);
export const pauseAccount = (id) => API.post(`/api/accounts/${id}/pause`);
export const resumeAccount = (id) => API.post(`/api/accounts/${id}/resume`);
export const updateDisplayName = (id, display_name) => API.put(`/api/accounts/${id}/display-name`, { display_name });

// Campaigns
export const getCampaigns = () => API.get('/api/campaigns');
export const getCampaign = (id) => API.get(`/api/campaigns/${id}`);
export const createCampaign = (data) => API.post('/api/campaigns', data);
export const launchCampaign = (id) => API.post(`/api/campaigns/${id}/launch`);
export const pauseCampaign = (id) => API.post(`/api/campaigns/${id}/pause`);
export const resumeCampaign = (id) => API.post(`/api/campaigns/${id}/resume`);
export const deleteCampaign = (id) => API.delete(`/api/campaigns/${id}`);

// Templates
export const getTemplates = () => API.get('/api/templates');
export const getTemplate = (id) => API.get(`/api/templates/${id}`);
export const createTemplate = (data) => API.post('/api/templates', data);
export const updateTemplate = (id, data) => API.put(`/api/templates/${id}`, data);
export const deleteTemplate = (id) => API.delete(`/api/templates/${id}`);

// Contacts
export const getContactLists = () => API.get('/api/contacts/lists');
export const addManualContacts = (data) => API.post('/api/contacts/manual', data);
export const uploadCSV = (formData) => API.post('/api/contacts/upload', formData);
export const deleteContactList = (name) => API.delete(`/api/contacts/lists/${name}`);

// Queue & Stats
export const getQueue = () => API.get('/api/queue');
export const getStats = () => API.get('/api/queue/stats');
export const getLogs = () => API.get('/api/queue/logs');

// Analytics
export const getAnalytics = () => API.get('/api/analytics');
export const getAnalyticsOverview = () => API.get('/api/analytics/overview/stats');
export const getCampaignOpens = (id) => API.get(`/api/analytics/${id}/opens`);
export const getCampaignUnopened = (id) => API.get(`/api/analytics/${id}/unopened`);

// Followups
export const getCampaignFollowups = (campaignId) => API.get(`/api/followups/campaign/${campaignId}`);
export const createFollowup = (data) => API.post('/api/followups', data);
export const updateFollowup = (id, data) => API.put(`/api/followups/${id}`, data);
export const deleteFollowup = (id) => API.delete(`/api/followups/${id}`);
export const pauseFollowup = (id) => API.post(`/api/followups/${id}/pause`);
export const resumeFollowup = (id) => API.post(`/api/followups/${id}/resume`);
export const getFollowupStatus = (id) => API.get(`/api/followups/${id}/status`);
export const getExclusions = (campaignId) => API.get(`/api/followups/exclusions/${campaignId}`);
export const addExclusions = (data) => API.post('/api/followups/exclusions', data);
export const removeExclusion = (id) => API.delete(`/api/followups/exclusions/${id}`);

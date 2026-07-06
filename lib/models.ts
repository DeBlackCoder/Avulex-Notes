import mongoose, { Schema, model, models } from 'mongoose'

// User
const UserSchema = new Schema({
  _id: { type: String },
  googleSub: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  displayName: String,
  avatarUrl: String,
  defaultNotebookId: String,
  pbkdf2Salt: String,
}, { timestamps: true, _id: false })

// Workspace
const WorkspaceSchema = new Schema({
  _id: { type: String },
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
}, { timestamps: true, _id: false })

// Notebook
const NotebookSchema = new Schema({
  _id: { type: String },
  workspaceId: { type: String, required: true, index: true },
  ownerUserId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  collaborators: [{ userId: String, permission: String, invitedAt: Date }],
}, { timestamps: true, _id: false })

// Folder
const FolderSchema = new Schema({
  _id: { type: String },
  notebookId: { type: String, required: true, index: true },
  parentFolderId: { type: String, default: null },
  ownerUserId: { type: String, required: true },
  name: { type: String, required: true },
  depth: { type: Number, default: 1 },
}, { timestamps: true, _id: false })

// Note
const NoteSchema = new Schema({
  _id: { type: String },
  ownerUserId: { type: String, required: true, index: true },
  notebookId: { type: String, required: true, index: true },
  folderId: { type: String, default: null },
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  contentCiphertext: { type: String, default: '' },
  contentIv: { type: String, default: '' },
  wordCount: { type: Number, default: 0 },
  isFavorite: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  isTrashed: { type: Boolean, default: false },
  trashedAt: { type: Date, default: null },
  originalNotebookId: { type: String, default: null },
  originalFolderId: { type: String, default: null },
}, { timestamps: true, _id: false })

// Version History
const VersionHistorySchema = new Schema({
  noteId: { type: String, required: true, index: true },
  ownerUserId: { type: String, required: true },
  titleCiphertext: String,
  contentCiphertext: String,
  contentIv: String,
  savedAt: { type: Date, default: Date.now },
})

// Activity Timeline
const ActivityTimelineSchema = new Schema({
  userId: { type: String, required: true, index: true },
  action: String,
  targetType: String,
  targetId: String,
  targetName: String,
  occurredAt: { type: Date, default: Date.now },
})

// Device
const DeviceSchema = new Schema({
  _id: { type: String },
  userId: { type: String, required: true, index: true },
  deviceName: String,
  os: String,
  browserName: String,
  sessionJti: String,
  lastActiveAt: Date,
  signedInAt: Date,
  isRevoked: { type: Boolean, default: false },
}, { _id: false })

// Push Subscription
const PushSubscriptionSchema = new Schema({
  userId: { type: String, required: true },
  deviceId: String,
  endpoint: String,
  keys: { p256dh: String, auth: String },
  enabled: { type: Boolean, default: true },
}, { timestamps: true })

// ── NEW COLLECTIONS ──────────────────────────────────────────────────────────

// AI Conversations — persists full Ava chat history per user
const AIConversationSchema = new Schema({
  _id: { type: String },
  userId: { type: String, required: true, index: true },
  title: { type: String, default: 'New conversation' },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  }],
  noteContext: { type: String, default: null },   // note title if conversation was started from a note
  noteId: { type: String, default: null },
  pinned: { type: Boolean, default: false },
  archived: { type: Boolean, default: false },
}, { timestamps: true, _id: false })

// Settings — per-user app preferences synced across devices
const SettingsSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  accentColor: { type: String, default: 'blue' },
  notificationsEnabled: { type: Boolean, default: false },
  notificationsDeniedAt: { type: Date, default: null },
  aiProvider: { type: String, enum: ['gemini', 'groq'], default: 'gemini' },
  sidebarCollapsed: { type: Boolean, default: false },
  editorFontSize: { type: String, default: 'md' },
}, { timestamps: true })

// Sessions — tracks active login sessions per device
const SessionSchema = new Schema({
  userId: { type: String, required: true, index: true },
  jwtJti: { type: String, required: true, unique: true },  // JWT ID for revocation
  deviceId: { type: String, default: null },
  deviceName: { type: String, default: null },
  os: { type: String, default: null },
  browserName: { type: String, default: null },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  lastActiveAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  isRevoked: { type: Boolean, default: false },
}, { timestamps: true })

// History — chronological log of note views, searches, exports, etc.
const HistorySchema = new Schema({
  userId: { type: String, required: true, index: true },
  action: {
    type: String,
    enum: [
      'note_viewed', 'note_created', 'note_edited', 'note_deleted',
      'search_performed', 'note_exported', 'note_imported',
      'ai_summarized', 'ai_titled', 'ai_chat_started',
      'notebook_created', 'notebook_deleted',
    ],
    required: true,
  },
  targetId: { type: String, default: null },
  targetTitle: { type: String, default: null },
  targetType: { type: String, enum: ['note', 'notebook', 'search', 'ai'], default: 'note' },
  meta: { type: Schema.Types.Mixed, default: {} },  // extra data e.g. search query, export format
  occurredAt: { type: Date, default: Date.now, index: true },
})

export const AIConversation = models.AIConversation || model('AIConversation', AIConversationSchema)
export const Settings = models.Settings || model('Settings', SettingsSchema)
export const Session = models.Session || model('Session', SessionSchema)
export const History = models.History || model('History', HistorySchema)

export const User = models.User || model('User', UserSchema)
export const Workspace = models.Workspace || model('Workspace', WorkspaceSchema)
export const Notebook = models.Notebook || model('Notebook', NotebookSchema)
export const Folder = models.Folder || model('Folder', FolderSchema)
export const Note = models.Note || model('Note', NoteSchema)
export const VersionHistory = models.VersionHistory || model('VersionHistory', VersionHistorySchema)
export const ActivityTimeline = models.ActivityTimeline || model('ActivityTimeline', ActivityTimelineSchema)
export const Device = models.Device || model('Device', DeviceSchema)
export const PushSubscriptionModel = models.PushSubscription || model('PushSubscription', PushSubscriptionSchema)

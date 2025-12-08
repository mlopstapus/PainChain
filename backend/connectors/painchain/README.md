# PainChain Connector

The PainChain connector is an internal system connector that automatically tracks and logs all configuration changes made within PainChain. Unlike external connectors (GitHub, GitLab, Kubernetes), PainChain logs events in real-time as they occur in the frontend, providing a complete audit trail of system changes.

## Overview

The PainChain connector is enabled by default and captures:

- **Connector Management** - Track connector creation, updates, and deletions
- **Configuration Changes** - Monitor field value updates and settings modifications
- **State Changes** - Log connector enable/disable actions
- **Field Visibility** - Track which event fields are shown or hidden

All events are stored in PainChain's database with detailed metadata for auditing and troubleshooting.

---

## Features

### Event Types Tracked

| Event Type | Description | Metadata Captured |
|------------|-------------|-------------------|
| **Connector Created** | New connector added to system | Connector name, type, author |
| **Connector Updated** | Connector configuration modified | Changed fields with old/new values |
| **Connector Deleted** | Connector removed from system | Connector name, type, author |
| **Connector Enabled** | Connector activated | Connector name, type, author |
| **Connector Disabled** | Connector deactivated | Connector name, type, author |
| **Config Changed** | Individual field value updated | Field name, old value, new value |
| **Field Visibility Changed** | Dashboard field display toggled | Event type, field name, visibility state |

### Key Capabilities

- **Real-Time Logging** - Events captured immediately when actions occur
- **Complete Audit Trail** - Full history of all system configuration changes
- **Change Tracking** - Before/after values for all modifications
- **User Attribution** - Track who made each change (author field)
- **No Configuration Required** - Works out of the box
- **Automatic Tagging** - Apply custom tags for filtering and organization

---

## Prerequisites

None. The PainChain connector is built-in and requires no external accounts, tokens, or special configuration.

---

## Configuration Guide

### Step 1: Access Settings

1. Navigate to the PainChain dashboard
2. Click the **Settings** button in the top-right header
3. Select **Integrations** from the left sidebar

### Step 2: Locate PainChain Connector

The PainChain connector is automatically created and enabled on system startup. You'll see it in the integrations list with:
- **Name**: "PainChain System" (default)
- **Status**: Enabled (green)
- **Type**: PainChain

### Step 3: Optional Configuration

Click on the PainChain connector card to customize:

#### Available Fields

**Connection Name**
- **Purpose**: Friendly identifier for this connector
- **Default**: `PainChain System`
- **Usage**: Helps identify the internal system connector

**Tags**
- **Purpose**: Apply custom labels for filtering and organization
- **Format**: Comma-separated tag names
- **Example**: `system,audit,changes`
- **Default**: `system,audit`
- **Usage**: Filter events in the dashboard by selecting specific tags

### Step 4: Field Visibility (Optional)

Customize which metadata fields appear for each event type:

1. Click on the PainChain connector in the integrations list
2. Scroll to the **Field Visibility** section at the bottom
3. Toggle which fields are displayed in the dashboard
4. Changes apply immediately to the dashboard view

---

## Event Data Structure

### Connector Created Events

**Title Format**: `[Connector Created] {connector_name}`

**Metadata Captured**:
```json
{
  "action": "create",
  "connector_type": "github|gitlab|kubernetes|painchain",
  "connector_name": "Connection Name"
}
```

**Description Contains**:
- Connector type
- Connector name
- Creation confirmation message

**Dashboard Fields**:
- Connector Name
- Connector Type
- Action (create)

---

### Connector Updated Events

**Title Format**: `[Connector Updated] {connector_name}`

**Metadata Captured**:
```json
{
  "action": "update",
  "connector_type": "github|gitlab|kubernetes|painchain",
  "connector_name": "Connection Name",
  "changes": {
    "field_name": {
      "old": "previous value",
      "new": "updated value"
    }
  }
}
```

**Description Contains**:
- List of all changed fields
- Before/after values for each change
- Field visibility changes (if any)

**Dashboard Fields**:
- Connector Name
- Connector Type
- Changes (detailed list)
- Action (update)

---

### Connector Deleted Events

**Title Format**: `[Connector Deleted] {connector_name}`

**Metadata Captured**:
```json
{
  "action": "delete",
  "connector_type": "github|gitlab|kubernetes|painchain",
  "connector_name": "Connection Name"
}
```

**Dashboard Fields**:
- Connector Name
- Connector Type
- Action (delete)

---

### Connector Enabled/Disabled Events

**Title Format**: `[Connector Enabled] {connector_name}` or `[Connector Disabled] {connector_name}`

**Metadata Captured**:
```json
{
  "action": "enable|disable",
  "connector_type": "github|gitlab|kubernetes|painchain",
  "connector_name": "Connection Name"
}
```

**Dashboard Fields**:
- Connector Name
- Connector Type
- Action (enable/disable)

---

### Config Changed Events

**Title Format**: `[Config Changed] {connector_name} - {field_name}`

**Metadata Captured**:
```json
{
  "action": "config_change",
  "field": "field_name"
}
```

**Description Contains**:
- Field name that changed
- Old value
- New value
- Connector name

**Dashboard Fields**:
- Connector Name
- Field
- Old Value
- New Value
- Action (config_change)

---

### Field Visibility Changed Events

**Title Format**: `[Field Visibility Changed] {event_type}`

**Metadata Captured**:
```json
{
  "action": "field_visibility_change",
  "event_type": "PullRequest|Release|WorkflowRun|etc",
  "field": "field_key",
  "visible": true|false
}
```

**Description Contains**:
- Event type affected
- Field that changed
- New visibility state

**Dashboard Fields**:
- Event Type
- Field
- Visible (true/false)
- Action (field_visibility_change)

---

## Use Cases

### Audit Trail

Track all configuration changes for compliance and security:
- Who added or removed connectors?
- When were sensitive tokens updated?
- What field visibility settings were changed?

**Example**: Investigate why production monitoring stopped working by reviewing PainChain events for connector disable/delete actions.

### Troubleshooting

Identify misconfigurations by reviewing recent changes:
- Which settings were modified before issues started?
- Did someone accidentally disable a critical connector?
- Were poll intervals changed affecting data freshness?

**Example**: Dashboard shows no GitHub events after 2pm. Check PainChain logs to find that poll interval was increased from 300s to 3600s at 1:45pm.

### Change Management

Maintain visibility into system evolution:
- Track when new integrations were added
- Monitor configuration drift over time
- Document system changes automatically

**Example**: Monthly report of all connector additions, removals, and configuration changes for management review.

### Team Coordination

Understand what teammates are configuring:
- See who added new monitoring connections
- Track tag organization changes
- Monitor field visibility preferences

**Example**: Frontend team added "ui-team" tag to GitHub connector for better event filtering.

---

## Technical Architecture

### Real-Time Event Logging

Unlike external connectors that poll APIs, PainChain events are logged synchronously:

1. **User Action** - User clicks "Save" in Settings page
2. **Frontend Detection** - JavaScript detects configuration changes
3. **API Call** - POST request to `/api/painchain/log` endpoint
4. **Database Storage** - Event immediately written to `change_events` table
5. **Dashboard Update** - Event appears in timeline and feed

### Event ID Format

Events use timestamp-based IDs for uniqueness:

- Format: `painchain-{event_type}-{timestamp}`
- Example: `painchain-connector_created-1705334567.891234`

These ensure events are unique and ordered chronologically.

### Integration Points

**Settings Page** (`Settings.jsx`):
- Detects all connector CRUD operations
- Compares old/new configuration values
- Calls `logPainChainEvent()` helper function

**API Endpoint** (`/api/painchain/log`):
- Validates event data with Pydantic models
- Routes to appropriate `log_*` method
- Returns success/failure status

**Connector Class** (`connector.py`):
- Provides specialized logging methods for each event type
- Handles event creation and deduplication
- Stores events with rich metadata

---

## Performance Considerations

### Database Storage

**Event Storage**:
- Each event: ~1-2KB (minimal description/metadata)
- Low volume: ~10-50 events per day typical usage
- No external API calls or network overhead

**Impact**: Negligible storage and performance impact on system.

### Real-Time vs. Polling

PainChain uses synchronous logging (events written immediately on user actions) rather than background polling. This provides:
- Instant visibility of changes
- Zero API rate limit concerns
- No polling overhead
- Accurate timestamps

---

## Security Best Practices

1. **Audit Access**:
   - Review PainChain events regularly for unauthorized changes
   - Monitor for unexpected connector deletions
   - Track token update events

2. **Change Attribution**:
   - Ensure all events capture the correct author
   - Use author field for accountability
   - Cross-reference with user logs

3. **Retention**:
   - Keep PainChain events for compliance requirements
   - Configure appropriate retention policies
   - Export events for long-term archival

---

## Troubleshooting

### PainChain Events Not Appearing

**Symptom**: Configuration changes don't create events

**Possible Causes**:
1. **Frontend Error** - JavaScript error preventing API call
   - Solution: Check browser console for errors
2. **API Endpoint Failure** - Backend not processing requests
   - Solution: Check API logs for `/api/painchain/log` errors
3. **Database Connection** - Cannot write to database
   - Solution: Verify database connectivity and permissions

### Incorrect Change Detection

**Symptom**: Events show changes that didn't occur (or miss actual changes)

**Possible Causes**:
1. **Array Comparison** - Default values vs. empty arrays
   - Solution: Verify `valuesEqual()` helper handles arrays correctly
2. **Field Visibility** - Initial state not captured
   - Solution: Ensure `initialFieldVisibility` is set on edit start

### Missing Metadata

**Symptom**: Events lack details (old values, change lists)

**Possible Causes**:
1. **Frontend Not Passing Data** - API call missing fields
   - Solution: Check network tab for complete request payload
2. **Backend Not Storing** - Connector method dropping fields
   - Solution: Verify `log_event()` receives all parameters

---

## Support and Resources

### Common Questions

**Q: Can I disable the PainChain connector?**
A: Yes, but it's not recommended. Disabling it will stop audit logging of all configuration changes. You can still disable it via Settings if needed.

**Q: Does it track who made changes?**
A: Yes, the `author` field captures the user who made each change. Currently defaults to "system" but can be extended to capture authenticated user info.

**Q: Can I export PainChain events?**
A: Currently, you can query events via the API at `/api/changes?source=painchain`. Export functionality is planned for a future release.

**Q: How long are events stored?**
A: PainChain events follow the same retention policy as other connector events (configurable in main settings).

**Q: Does it track password/token values?**
A: For security, token fields are not logged in plain text. Change events note that a token was updated but don't include the actual value.

---

## Changelog

### Version 1.0 (Current)
- Connector CRUD operation tracking
- Configuration change logging with before/after values
- Field visibility change tracking
- Tag management logging
- Real-time event creation
- Full metadata capture

---

## Contributing

To improve the PainChain connector:

1. Fork the PainChain repository
2. Make changes in `/backend/connectors/painchain/`
3. Test thoroughly with various configuration scenarios
4. Submit PR with clear description of changes
5. Update this README with new features

---

**Last Updated**: 2024-01-15
**Connector Version**: 1.0
**Type**: Internal System Connector

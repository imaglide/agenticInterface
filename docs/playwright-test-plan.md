# Playwright MCP UI Test Plan

## Overview

Manual UI testing using Playwright MCP browser tools to verify all user-facing functionality.

**Base URL:** http://localhost:3010 (or http://agentic.test/)

---

## Pre-Test Setup

```
1. Start dev server: npm run dev
2. Navigate to base URL
3. Verify page loads without console errors
```

---

## Test Suite 1: Main Page (/)

### 1.1 Initial Load
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/` | Page loads with "Phase E Test" header |
| 2 | Check component count | Shows "15 components" |
| 3 | Verify mode | Default mode is "Neutral / Intent" (highlighted) |
| 4 | Check layout info | Shows Layout: stack, Confidence: LOW |

### 1.2 Mode Switching
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Meeting Prep" button | Mode switches, button highlights blue |
| 2 | Verify layout changes | Layout shows "split", main content updates |
| 3 | Click "Meeting Capture" button | Mode switches to capture |
| 4 | Verify layout | Layout shows "single" |
| 5 | Click "Post-Meeting Synthesis" | Mode switches to synthesis |
| 6 | Verify layout | Layout shows "stack" |
| 7 | Click "Neutral / Intent" | Returns to neutral mode |

### 1.3 Plan Inspector
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Plan Inspector" button | Expands to show JSON |
| 2 | Verify JSON content | Shows id, mode, layout, confidence, components |
| 3 | Click again | Collapses inspector |

### 1.4 Decision Capsule ("Why this view?")
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "? Why this view?" button | Capsule panel opens |
| 2 | Verify content | Shows view label, confidence, reason |
| 3 | Check "Would change if" section | Lists conditions |
| 4 | Check alternative modes | Shows other mode options if applicable |
| 5 | Click outside or close | Panel closes |

### 1.5 Neutral Mode Components
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | In Neutral mode, verify header | "What's on your mind?" visible |
| 2 | Check intent input | Text input with "Set Intent" button |
| 3 | Verify suggestions | Shows "Prepare for next meeting", "Review recent meeting", "Focus work" |
| 4 | Check adjacent suggestion | Shows "You might want to" card |

### 1.6 Prep Mode Components
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Switch to Meeting Prep | Split layout renders |
| 2 | Verify left panel | Context snippets card visible |
| 3 | Verify right panel | Meeting goal card, My3 goals card visible |
| 4 | Check prep prompts | Prompts card shows questions |

### 1.7 Capture Mode Components
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Switch to Meeting Capture | Single layout renders |
| 2 | Verify meeting header | Shows meeting title |
| 3 | Check goals strip | Goals checklist visible at top |
| 4 | Verify markers panel | Marker buttons (Decision, Action, Risk, Question) |
| 5 | Check bottom hint bar | Shows capture hints |

### 1.8 Synthesis Mode Components
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Switch to Synthesis | Stack layout renders |
| 2 | Verify goals outcome | Shows goals with outcomes |
| 3 | Check markers summary | Lists captured markers |
| 4 | Verify next actions | Shows action items |

---

## Test Suite 2: Dev Harness

### 2.1 Visibility
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Load page in dev mode | Dev Harness visible on right side |
| 2 | Add `?noharness` to URL | Dev Harness hidden |
| 3 | Remove param, reload | Dev Harness visible again |

### 2.2 Force Mode
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select "Meeting Prep" radio | Radio selected |
| 2 | Click "Apply" | Mode changes to prep |
| 3 | Verify main UI updates | Prep components render |

### 2.3 Meeting Simulation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set "Starts in" to 5 min | Input shows 5 |
| 2 | Click "Start Simulation" | Simulation starts |
| 3 | Check current state | Shows meeting info |
| 4 | Wait for meeting to "start" | Mode auto-switches to Capture |

### 2.4 Goal Injection
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Switch to Prep mode | Prep UI visible |
| 2 | Check goal checkboxes | Select 2 goals |
| 3 | Click "Inject Selected" | Goals appear in My3 card |

### 2.5 Marker Addition
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Switch to Capture mode | Capture UI visible |
| 2 | Select marker type | Dropdown shows types |
| 3 | Enter label | Text appears |
| 4 | Click "Add Marker" | Marker added to panel |

### 2.6 Event Log
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Perform various actions | Events accumulate |
| 2 | Check event log section | Shows event count |
| 3 | Click "Export JSON" | Downloads event data |

---

## Test Suite 3: Founder Test Dashboard (/founder-test)

### 3.1 Navigation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Founder Test Dashboard" link | Navigates to /founder-test |
| 2 | Verify page title | "Founder Test Dashboard" visible |
| 3 | Click "Back to App" | Returns to main page |

### 3.2 Core Metrics Display
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View Override Rate card | Shows percentage, formula, raw counts |
| 2 | View Capsule Open Rate | Shows percentage and formula |
| 3 | View Bounce Rate | Shows percentage, threshold indicator |
| 4 | Check warning states | Red highlight if threshold exceeded |

### 3.3 Utilization Metrics
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View Goal Utilization | Shows percentage for prep |
| 2 | View Marker Utilization | Shows percentage for capture |
| 3 | View Synthesis Completion | Shows percentage |

### 3.4 Bounce Rate by Mode
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View bounce chart | Bar chart per mode |
| 2 | Check color coding | Red if >20%, green otherwise |

### 3.5 Override Log
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View override log table | Shows date, time, from, to, reason |
| 2 | Verify scrolling | Table scrolls if many entries |

### 3.6 Daily Journal
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find "First screen correct?" | Prominent Y/N radio buttons |
| 2 | Select "Yes" | Radio selected, green highlight |
| 3 | Select "No" | Radio selected, red highlight |
| 4 | Fill in journal fields | Text entered in textareas |

### 3.7 Friction Log
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select mode from dropdown | Mode selected |
| 2 | Enter issue description | Text in input |
| 3 | Click "Add" | Entry appears in table |
| 4 | Add multiple entries | All show in table |

### 3.8 Success Criteria
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click checkbox items | Checkboxes toggle |
| 2 | Check all 5 items | All show green/checked |

### 3.9 Export Functions
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Export JSON" | Downloads .json file |
| 2 | Click "Generate Report" | Downloads .md file |
| 3 | Click "Refresh Data" | Metrics refresh |

---

## Test Suite 4: Session Tracking (Implicit)

### 4.1 Bounce Detection
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open app, wait 25 seconds without interaction | Bounce event logged |
| 2 | Check founder-test bounce rate | Shows bounce recorded |

### 4.2 Interaction Recording
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open app, immediately click something | No bounce (interaction recorded) |
| 2 | Check event log | session_interacted event present |

---

## Test Suite 5: Responsive & Edge Cases

### 5.1 Browser Resize
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Resize to 1200px width | Full layout visible |
| 2 | Resize to 800px width | Layout adapts |
| 3 | Resize to 400px width | Mobile-friendly layout |

### 5.2 Rapid Mode Switching
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click through all modes rapidly | No crashes, UI updates correctly |
| 2 | Check console | No errors |

### 5.3 Empty States
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Clear site data | Fresh state |
| 2 | Load founder-test | Shows 0 counts gracefully |
| 3 | Load main page | Defaults work correctly |

---

## Test Execution Checklist

- [x] Suite 1: Main Page (8 sections)
- [x] Suite 2: Dev Harness (6 sections)
- [x] Suite 3: Founder Test Dashboard (9 sections)
- [x] Suite 4: Session Tracking (2 sections)
- [x] Suite 5: Responsive & Edge Cases (3 sections)

---

## Notes

- Use `browser_snapshot` for state verification
- Use `browser_console_messages` to check for errors
- Use `browser_click` with element refs from snapshots
- Use `browser_type` for text input
- Use `browser_wait_for` when testing time-based features

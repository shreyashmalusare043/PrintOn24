# Requirements Document

## 1. Application Overview

Print on 24 is a web application connecting end users with local partner print shops. This specification updates the User Panel with critical stabilization and functional refinements covering canvas image editing, document orientation detection, Excel spreadsheet scaling, disabled shop discovery blocking, scanner UI alignment, map coordinate preservation, configuration persistence, desktop sidebar branding, popup reduction, and end-to-end workflow consistency.

Key areas of refinement:
- **Image Editor Canvas Preview Restoration**: Restore the in-card canvas preview within the Image Edit card without clipping or overlap; support smooth resize, reposition, crop, rotate, zoom, and multi-image layering, saving the full composition to database and storage matching final print output.
- **Document Orientation & Landscape Rendering**: Detect and preserve original file orientation by default; render and print in selected orientation across desktop, mobile, and Eye-icon previews without shrinking, cropping, or aspect distortion.
- **Dedicated Excel Scaling Modes**: Provide distinct Excel scaling options (No Scaling, Fit Sheet on One Page, Fit All Columns on One Page, Fit All Rows on One Page) preserving table structures, borders, and merged cells.
- **Disabled Shop Discovery Blocking**: Block disabled or inactive print shops across QR scanning, manual code input, and search results with backend status validation.
- **Scanner Page UI Alignment**: Left-align the Search Shop action, fix search bar width and label visibility, and ensure responsive search result cards.
- **Shop Map Coordinate Integrity**: Prevent map recentering or user GPS coordinate overwriting when clicking shop location markers.
- **Configuration Persistence & End-to-End Consistency**: Persist full print settings to the database and ensure identical parameters flow through upload, editing, preview, and physical print output.
- **Branding & Popup Streamlining**: Display the original Print on 24 logo asset on the desktop left sidebar while pruning redundant informational popups.

## 2. Target Users and Core Scenarios

### 2.1 Target Users
- **Guest Users**: Visitors scanning QR codes or entering shop codes, uploading documents, configuring layouts, and previewing jobs.
- **Registered Customers**: Users managing print configurations, editing image compositions, viewing shop locations, and tracking order histories.

### 2.2 Core Scenarios
- **Connecting to Active Shops**: A user scans a QR code or searches for a shop; the system verifies shop active status, blocks disabled shops with an explicit notice, and loads shop-specific paper sizes and pricing.
- **Editing and Saving Image Compositions**: A user uploads images, edits transformations directly on the in-card canvas preview, adds layers, and saves the final layout matching preview and print output.
- **Configuring Multi-Format Documents with Orientation & Scaling**: A user uploads a landscape presentation or multi-column Excel sheet; the system detects original orientation and applies chosen scaling rules accurately across mobile and desktop preview windows.

## 3. Page Structure and Functional Specifications

```
Print on 24 User Panel
├── Left Sidebar (Desktop Only)
│   └── Original Print on 24 Brand Logo
├── TopHeader (Mobile & Desktop Header)
│   ├── Brand Logo (Mobile Header)
│   └── Connected Enterprise Badge (Logo / Initials Fallback)
├── Home Page
│   ├── Quick Action Cards
│   └── Recent Enterprises Quick Scroll Bar
├── Shop Scanner & Search Page
│   ├── Camera Scanner Card
│   └── Manual Search Card
│       ├── Left-Aligned Search Shop Header
│       ├── Full-Width Search Input Field
│       └── Search Result Cards List (Active Shops Only)
├── Document Upload & Configuration Page
│   ├── Uploaded File Card
│   │   ├── File Metadata (Name, Size, Type)
│   │   └── Eye Icon Action (Next-Window Preview)
│   ├── Print Configuration Panel
│   │   ├── Paper Size Selector (Dynamic Shop DB Sizes, Default A4)
│   │   ├── Orientation Selector (Auto-Detected Default: Portrait / Landscape)
│   │   ├── Print Type Selector (Color / B&W)
│   │   ├── Print Sides Selector (Single-Sided / Double-Sided)
│   │   ├── Copies Input (Range 1-999, Default 1)
│   │   ├── Page Range Input (Default: All Pages)
│   │   ├── Pages Per Sheet Selector (1-in-1, 2-in-1, 4-in-1)
│   │   └── Excel Scaling Selector (Visible for XLS/XLSX Files Only)
│   ├── In-Card Image Editor (Visible for Image Uploads)
│   │   ├── Restored Canvas Viewport (In-Card Preview, Contained Alignment)
│   │   ├── Transform Controls (Resize Handles, Drag Move, Crop, Rotate, Zoom)
│   │   └── Multi-Image Layer Manager (Add Images, Reorder Layers, Save Composition)
│   └── Estimate Total Card (Real-Time Pricing Calculation)
├── Shop Profile Page
│   ├── Shop Header (Logo / Initials, Rates, Status)
│   ├── Location Map Section (Non-Destructive Marker Selection)
│   └── Print Order History
└── User Profile Page
    ├── User Information
    └── Saved GPS Coordinates & Nearby Shops Map
```

### 3.1 Document Upload & Configuration Page
- **Orientation Auto-Detection & Rendering**:
  - Detect original page orientation and dimensions upon upload (e.g., landscape PDF/PPT remains Landscape by default; portrait remains Portrait).
  - Render and print documents in the active orientation across desktop, mobile, and the Eye-icon next-window preview.
  - Ensure landscape documents on mobile scale proportionally to the selected paper size without edge clipping, shifting, or shrinking.
- **Excel-Specific Scaling Options**:
  - Display a dedicated scaling selector for XLS and XLSX files containing four independent modes:
    - `No Scaling`: Render sheets at 100% native scale.
    - `Fit Sheet on One Page`: Shrink sheet content proportionally to fit within a single physical page.
    - `Fit All Columns on One Page`: Scale sheet width to fit printable width while flowing rows naturally across multiple pages.
    - `Fit All Rows on One Page`: Scale sheet height to fit printable height while flowing columns across multiple pages.
  - Preserve cell contents, formulas, cell borders, and merged cell structures in all scaling modes.
- **In-Card Image Editor Preview & Composition Storage**:
  - Restore the working canvas preview directly inside the Image Edit card on both desktop and mobile viewports.
  - Eliminate canvas clipping and overlapping boundaries while keeping images visible.
  - Enable direct manipulation: click-to-select, smooth dragging, 8-point corner resizing, rotation, zoom, cropping, and adding multiple image layers.
  - Persist the final composite layout (coordinates, dimensions, rotation, cropping, layers) to database and storage so rendered previews and physical prints match 1:1.
- **Configuration Persistence**:
  - Persist complete configuration parameters (`paper_size`, `orientation`, `print_type`, `sides`, `copies`, `page_range`, `pages_per_sheet`, `excel_scaling`) to the backend database upon selection.
  - Reload stored parameters automatically when reopening existing print jobs or orders.
  - Feed identical configuration parameters into the Eye-icon preview renderer and final print job generation.

### 3.2 Shop Scanner & Search Page
- **Disabled Shop Blocking**:
  - Validate partner shop active status against database records before returning details on QR scan, manual code entry, or keyword search.
  - If a shop is marked disabled/inactive, block connection and display a clear notification stating the shop is currently unavailable.
- **Layout & Alignment Fixes**:
  - Left-align the \"Search Shop\" button/header on the manual search card.
  - Set full-width, unclipped search input layout beneath the header to display complete shop names and codes.
  - Maintain consistent padding, card width, and responsive wrapping for search result items.

### 3.3 Shop Profile & Location Map
- **Map Coordinate Preservation**:
  - Clicking shop location markers on the map must pan/focus on the shop without resetting the map to default coordinates or overwriting user-saved GPS location in state or storage.

### 3.4 Branding & Notification Optimization
- **Desktop Sidebar Branding**:
  - Render the original Print on 24 logo asset inside the desktop left navigation sidebar while maintaining standard mobile header logo presentation.
- **Popup Reduction**:
  - Remove non-essential informational and confirmation dialogs across upload, configuration, and navigation flows.
  - Restrict modal popups strictly to critical input validation errors, payment confirmations, and security warnings.

## 4. Business Rules and Core Logic

### 4.1 Shop Verification & Availability Rule
- A shop is discoverable and connectable if and only if `print_shops.is_active === true` and `print_shops.is_disabled === false`.
- Inactive shops are filtered out from search queries and rejected during QR or code resolution.

### 4.2 Document Orientation & Aspect Fitting
- Default Orientation = `DetectedPageWidth > DetectedPageHeight ? 'Landscape' : 'Portrait'`.
- Content Scaling Factor `S = min(PrintableWidth / PageWidth, PrintableHeight / PageHeight)`.
- Margin alignment must center content within printable boundaries without cropping.

### 4.3 Excel Sheet Layout Rule
- If `excel_scaling === 'Fit Sheet on One Page'`, apply uniform scale `S = min(PrintableWidth / SheetWidth, PrintableHeight / SheetHeight)`.
- If `excel_scaling === 'Fit All Columns on One Page'`, apply `S = PrintableWidth / SheetWidth` and paginate vertical overflow.
- If `excel_scaling === 'Fit All Rows on One Page'`, apply `S = PrintableHeight / SheetHeight` and paginate horizontal overflow.

### 4.4 Data Pipeline & Print Uniformity
- Configuration data, canvas transformation metadata, and rendered preview tokens must share a unified print job schema ensuring exact parity between on-screen preview, storage assets, and physical print output.

## 5. Exceptions and Edge Cases

| Scenario | Trigger Condition | System Handling Rule |
| :--- | :--- | :--- |
| Disabled Shop Scanned | User scans QR code or enters code of an inactive shop | Block shop connection, display \"Shop is currently unavailable\", and keep previous valid shop or empty state |
| Mixed Orientation Document | Uploaded file contains both portrait and landscape pages | Respect global orientation override or apply per-page orientation fitting without cropping content |
| Large Multi-Sheet Excel File | Uploaded workbook contains multiple worksheets | Apply selected Excel scaling rule across active sheets and calculate total printable pages dynamically |
| Image Canvas Layer Overflow | User resizes or moves image layer outside canvas limits | Constrain bounding box coordinates within maximum printable canvas margins |
| Marker Click on Map | User selects a partner shop marker on the map | Highlight shop details without altering saved user GPS coordinates or resetting center point |

## 6. Acceptance Criteria

1. The Image Edit card renders a fully working in-card canvas preview on desktop and mobile without boundary clipping or overlapping UI elements.
2. In-card image editing allows smooth dragging, corner resizing, cropping, rotation, zoom, and adding layers, with the saved composition matching the final preview and print output.
3. Uploading landscape-oriented files (e.g., presentations, landscape PDFs) automatically detects landscape orientation by default and renders fully without edge clipping or forced portrait shrinking on desktop and mobile.
4. Excel documents provide independent scaling options (No Scaling, Fit Sheet on One Page, Fit All Columns on One Page, Fit All Rows on One Page) that preserve table structures and cell borders in preview and print.
5. Inactive or disabled partner shops cannot be discovered or connected via QR scan, manual code input, or search queries, returning a clear unavailability message.
6. The Shop Scanner page displays a left-aligned Search Shop header, an unclipped responsive search bar, and properly spaced result cards.
7. Interacting with shop location map markers displays shop info without resetting map view or overwriting user-saved GPS coordinates.
8. Selected print configuration parameters (paper size, orientation, color, sides, copies, page range, pages per sheet, Excel scaling) persist to the database and reload upon reopening the job.
9. The desktop left sidebar displays the original Print on 24 logo asset.
10. Non-essential informational popups are eliminated while retaining critical validation, payment, and security alerts.

## 7. Out of Scope

- In-browser rich text and formula editing inside uploaded Excel or Word documents.
- Physical printer hardware driver management and shop inventory tracking.
- Aggregated multi-shop checkout in a single print order.
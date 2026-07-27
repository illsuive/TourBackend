# ⚙️ MoonVoyage Operations — Scalable MERN Backend Architecture Blueprint

Welcome to the core server-side subsystem for the **MoonVoyage Operations Platform**. This engine is built on **Node.js (v24+)**, powered by **Express.js**, and engineered around an optimized **Mongoose / MongoDB** storage layer. 

The backend acts as the central execution desk: processing deterministic JSON generation layers using the Google Gemini SDK, managing cryptographic ledger signatures for financial systems, and enforcing strict role-based access tokens across all routes.

---

## 🏗️ Architectural Pattern & Route Topologies

The server uses an enterprise MVC (Model-View-Controller) design pattern. Request filtering pipelines protect database safety boundaries by using custom middleware blocks before hits register on route definitions.

```mermaid
graph TD
    A[Client Request HTTP] --> B[Express Core Router]
    B -->|Path Validation Pass| C[Middleware Guard: protect]
    C -->|JWT Token Signature Verified| D{Admin Access Path?}
    D -->|Yes| E[Middleware Guard: admin]
    D -->|No| F[General User Controller Stack]
    E -->|Validation Pass| G[Administrative Controller Stack]
    
    style C fill:#7c3aed,stroke:#fff,stroke-width:2px,color:#fff
    style E fill:#d97706,stroke:#fff,stroke-width:2px,color:#fff
    style G fill:#f3e8ff,stroke:#c084fc,stroke-width:1px


erDiagram
    USER ||--o{ TRIP : "owns / generates"
    USER {
        ObjectId _id PK
        String name
        String email
        String password
        String role "user | admin"
        Boolean isAccountActive
    }
    TRIP ||--o{ ACTIVITY : "contains structural daily tracking arrays"
    TRIP {
        ObjectId _id PK
        ObjectId userId FK "Creator / Admin Link"
        ObjectId assignedTo FK "Target User Allocation"
        Boolean isPublic
        Boolean isPurchased
        String destination
        Number price
        Number totalSeats
        Number seatsAllotted
        Object budgetBreakdown "Embedded Array Logs"
        Array hotels "Embedded Hotel Objects"
    }
    TRIP ||--o{ BOOKING_MANIFEST : "embeds verification records directly"
    BOOKING_MANIFEST {
        ObjectId userId FK "Buyer Reference"
        String razorpayOrderId
        String razorpayPaymentId
        Number amountPaid
        Date purchasedAt
    }



    sequenceDiagram
    autonumber
    participant Controller as tripController.js
    participant Service as aiService.js
    participant SDK as @google/genai Engine
    participant LLM as gemini-2.5-flash Model

    Controller->>Service: Invokes generateNewItinerary({ destination, duration, budgetType })
    Note over Service: Construct target prompt template<br/>Inject custom Tokyo hotel seeding blocks if mapped
    Service->>SDK: models.generateContent() Configuration Parameter Object
    Note over SDK: Bind responseMimeType: "application/json"<br/>Inject travelItinerarySchema definition tree
    SDK->>LLM: Directives Transmitted to Processing Grid
    LLM-->>SDK: Emits Validated JSON String Output
    SDK-->>Service: Content Returned to Runtime Instance
    Service->>Controller: Parse JSON string & pass back pure data object



    sequenceDiagram
    autonumber
    participant Client as Frontend JavaScript Client
    participant Controller as tripController.js
    participant Crypto as Node.js Crypto Core Engine
    participant DB as MongoDB Instance

    Client->>Controller: POST /payment/verify (OrderId, PaymentId, Signature)
    Note over Controller: Construct Token string:<br/>order_id + "|" + payment_id
    Controller->>Crypto: createHmac('sha256', secret).update(Token).digest('hex')
    Crypto-->>Controller: Returns Computed Checksum Signature String
    Note over Controller: Perform explicit bitwise verification balance check:<br/>computedSignature === razorpay_signature
    alt Signature Validations Match
        Controller->>DB: Pull Trip document context up into memory grid
        Note over DB: Check if user already exists in bookingManifest array
        DB->>DB: Push PaymentLog receipt, increment seatsAllotted / set isPurchased = true
        DB-->>Controller: Document changes saved successfully
        Controller-->>Client: HTTP 200 (Success Status + Updated Document Data Payload)
    else Signature Security Breach Mismatch
        Controller-->>Client: HTTP 400 (Gateway Checksum Signature Validation Mismatch)
    </td>


    graph LR
    A[Admin Deletes User ID] --> B[User.findByIdAndDelete]
    B --> C[Trip.deleteMany: userId == Target User ID]
    B --> D[Payment.deleteMany: userId == Target User ID]
    C --> E[Platform Storage Synced cleanly with zero data fragmentation]
    D --> E
    
    style A fill:#d97706,stroke:#fff,stroke-width:1px,color:#fff
    style E fill:#059669,stroke:#fff,stroke-width:1px,color:#fff



    ### 🎯 Key Visual Integration Wins:
*   **Mermaid ERD Definitions:** Clearly explains how `bookingManifest` and `itinerary` stay securely packed inside the main `Trip` schema as nested array logs.
*   **Cryptographic Workflows:** Maps out the step-by-step verification logic, highlighting how incoming payloads combine with `process.env.RAZORPAY_KEY_SECRET` to verify signatures before modifying data.
*   **AI Engine Blueprint:** Outlines the exact sequence of controller actions that handle normalization, Gemini validation schemas, and database hydration.

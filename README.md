# 🌌 MoonVoyage Operations — Scalable Full-Stack AI Itinerary & E-Commerce Ecosystem

Welcome to the production-ready master architectural blueprint for the **MoonVoyage Operations Platform**. This enterprise ecosystem combines an intelligent client dashboard, deterministic generative AI orchestration engines, role-based administrative workspaces, and a cryptographic e-commerce payment infrastructure built entirely on the modern MERN stack.

---

## 🏛️ System & Architecture Topology

The application relies on a micro-monolith layout pattern. Request filtering pipelines protect database boundaries by enforcing strict JSON verification rules, cross-origin security walls, and role-based validation hooks before client hits register on Express route controllers.

### 1. Modular Request Orchestration Trace
The diagram below shows how an incoming client interaction safely filters through the twin-guard authentication security firewalls:

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

```
```mermaid
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
```
```mermaid
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
```
```mermaid
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
    end
```
```mermaid
    graph LR
    A[Admin Deletes User ID] --> B[User.findByIdAndDelete]
    B --> C[Trip.deleteMany: userId == Target User ID]
    B --> D[Payment.deleteMany: userId == Target User ID]
    C --> E[Platform Storage Synced cleanly with zero data fragmentation]
    D --> E
    
    style A fill:#d97706,stroke:#fff,stroke-width:1px,color:#fff
    style E fill:#059669,stroke:#fff,stroke-width:1px,color:#fff

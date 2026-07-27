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

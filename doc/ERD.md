---
config:
  layout: elk
---

erDiagram
    direction TB

    USER {
        bigint user_id PK
        string username
        string email UK
        string password_hash
        string full_name
        string phone
        string avatar_url
        string status
        datetime created_at
        datetime updated_at
    }

    ROLE {
        bigint role_id PK
        string role_name UK
        string description
        datetime created_at
    }

    PERMISSION {
        bigint permission_id PK
        string permission_name UK
        string description
        datetime created_at
    }

    USER_ROLE {
        bigint user_id PK, FK
        bigint role_id PK, FK
        datetime assigned_at
    }

    ROLE_PERMISSION {
        bigint role_id PK, FK
        bigint permission_id PK, FK
    }

    AUTH_SESSION {
        bigint session_id PK
        bigint user_id FK
        string device_name
        string device_type
        string ip_address
        datetime created_at
        datetime last_active_at
        datetime revoked_at
    }

    REFRESH_TOKEN {
        bigint refresh_token_id PK
        bigint session_id FK
        string token_hash
        datetime expires_at
        datetime revoked_at
        datetime created_at
    }

    PASSWORD_RESET_TOKEN {
        bigint reset_token_id PK
        bigint user_id FK
        string token_hash
        datetime expires_at
        datetime used_at
        datetime created_at
    }

    ACCOUNT_ACTIVATION_TOKEN {
        bigint activation_token_id PK
        bigint user_id FK
        string token_hash
        datetime expires_at
        datetime used_at
        datetime created_at
    }

    USER_ADDRESS {
        bigint address_id PK
        bigint user_id FK
        string recipient_name
        string recipient_phone
        string address_line
        string ward
        string district
        string province
        decimal latitude
        decimal longitude
        string place_id
        boolean is_default
        datetime created_at
        datetime updated_at
    }

    LED_MODEL {
        bigint model_id PK
        string model_name
        string description
        string specifications
        bigint stock_quantity
        string image_url
        int width
        int height
        string resolution
        decimal price
        datetime created_at
        datetime updated_at
    }

    LED_INSTANCE {
        bigint instance_id PK
        bigint user_id FK
        bigint model_id FK
        bigint current_firmware_id FK
        string serial_number UK
        string mac_address UK
        string hardware_version
        string status
        datetime manufactured_at
    }

    WARRANTY {
        bigint warranty_id PK
        bigint order_id FK
        bigint instance_id FK
        date start_date
        date end_date
        string status
        datetime created_at
        datetime updated_at
    }

    DEVICE_RETURN {
        bigint return_id PK
        bigint order_id FK
        bigint instance_id FK
        string reason
        string status
        datetime returned_at
        datetime created_at
        datetime updated_at
    }

    FIRMWARE_VERSION {
        bigint firmware_id PK
        string version_name UK
        string file_url
        string release_notes
        boolean is_active
        datetime released_at
        datetime created_at
    }

    FIRMWARE_UPDATE {
        bigint update_id PK
        bigint instance_id FK
        bigint firmware_id FK
        string status
        datetime requested_at
        datetime started_at
        datetime completed_at
        string error_message
    }

    CHARACTER {
        bigint character_id PK
        string name
        string description
        string thumbnail_url
        bigint creator_user_id FK
        string visibility
        string status
        datetime created_at
        datetime updated_at
    }

    CHARACTER_VERSION {
        bigint version_id PK
        bigint character_id FK
        bigint store_listing_id FK
        int version_number
        string file_url
        string led_binary_url
        string format
        int width
        int height
        int frame_count
        int frame_delay_ms
        int byte_size
        string changelog
        boolean is_current
        datetime created_at
    }

    USER_ENTITLEMENT {
        bigint entitlement_id PK
        bigint user_id FK
        bigint character_id FK
        string source_type
        bigint source_reference_id
        datetime granted_at
    }

    STORE_LISTING {
        bigint listing_id PK
        bigint publisher_user_id FK
        decimal price
        boolean is_free
        string status
        datetime published_at
        datetime updated_at
    }

    TAG {
        bigint tag_id PK
        string name UK
        string description
        datetime created_at
    }

    LISTING_TAG {
        bigint listing_id PK, FK
        bigint tag_id PK, FK
    }

    CART {
        bigint cart_id PK
        bigint user_id FK
        datetime updated_at
    }

    CART_ITEM {
        bigint cart_item_id PK
        bigint cart_id FK
        string product_type
        bigint listing_id FK
        bigint instance_id FK
        int quantity
        decimal unit_price
        datetime added_at
    }

    ORDER {
        bigint order_id PK
        bigint user_id FK
        bigint shipping_address_id FK
        string recipient_name
        string recipient_phone
        string shipping_address
        string shipping_ward
        string shipping_district
        string shipping_province
        decimal shipping_latitude
        decimal shipping_longitude
        decimal subtotal
        decimal shipping_fee
        decimal total_amount
        string status
        datetime created_at
        datetime updated_at
    }

    ORDER_ITEM {
        bigint order_item_id PK
        bigint order_id FK
        string product_type
        bigint listing_id FK
        bigint instance_id FK
        int quantity
        decimal unit_price
        decimal subtotal
    }

    PAYMENT_TRANSACTION {
        bigint payment_id PK
        bigint user_id FK
        bigint order_id FK
        bigint commission_id FK
        string method
        decimal amount
        string transaction_code
        string status
        datetime paid_at
        datetime created_at
    }

    DELIVERY {
        bigint delivery_id PK
        bigint order_id FK
        string provider
        string external_delivery_id
        string tracking_number
        string status
        string delivery_address
        string recipient_name
        string recipient_phone
        decimal latitude
        decimal longitude
        decimal shipping_fee
        datetime estimated_delivery_at
        datetime shipped_at
        datetime delivered_at
        datetime created_at
        datetime updated_at
    }

    COMMISSION {
        bigint commission_id PK
        bigint customer_id FK
        bigint priced_by_user_id FK
        string title
        string description
        decimal price
        string status
        datetime priced_at
        datetime created_at
        datetime updated_at
    }

    COMMISSION_SUBMISSION {
        bigint submission_id PK
        bigint commission_id FK
        bigint designer_id FK
        bigint character_id FK
        int version_number
        string file_url
        string file_type
        string attachment_url
        string attachment_type
        string review_decision
        bigint reviewer_id FK
        string review_comment
        datetime reviewed_at
        datetime submitted_at
    }

    COMMISSION_ASSIGNMENT {
        bigint assignment_id PK
        bigint commission_id FK
        bigint designer_id FK
        bigint assigned_by FK
        string status
        datetime assigned_at
    }

    COMMISSION_PRICE_CONFIG {
        bigint config_id PK
        string config_name
        string config_code UK
        string description
        boolean is_required
        boolean is_active
        int display_order
        datetime created_at
        datetime updated_at
    }

    COMMISSION_PRICE_OPTION {
        bigint option_id PK
        bigint config_id FK
        string option_name
        string option_value
        decimal additional_price
        boolean is_active
        int display_order
        datetime created_at
        datetime updated_at
    }

    COMMISSION_CONFIG_SELECTION {
        bigint commission_id PK, FK
        bigint option_id PK, FK
        decimal price_snapshot
    }

    CONVERSATION {
        bigint conversation_id PK
        string conversation_type
        datetime created_at
        datetime updated_at
    }

    CONVERSATION_PARTICIPANT {
        bigint conversation_id PK, FK
        bigint user_id PK, FK
        datetime joined_at
    }

    MESSAGE {
        bigint message_id PK
        bigint conversation_id FK
        bigint sender_id FK
        string message
        datetime sent_at
    }

    USER ||--o{ USER_ROLE : has
    ROLE ||--o{ USER_ROLE : assigned_to
    ROLE ||--o{ ROLE_PERMISSION : has
    PERMISSION ||--o{ ROLE_PERMISSION : assigned_to

    USER ||--o{ AUTH_SESSION : has
    AUTH_SESSION ||--o{ REFRESH_TOKEN : contains
    USER ||--o{ PASSWORD_RESET_TOKEN : requests
    USER ||--o{ ACCOUNT_ACTIVATION_TOKEN : receives

    USER ||--o{ USER_ADDRESS : saves

    USER ||--o{ LED_INSTANCE : owns
    LED_MODEL ||--o{ LED_INSTANCE : contains
    FIRMWARE_VERSION ||--o{ LED_INSTANCE : installed_on
    LED_INSTANCE ||--o{ FIRMWARE_UPDATE : receives
    FIRMWARE_VERSION ||--o{ FIRMWARE_UPDATE : targets

    ORDER ||--o{ WARRANTY : includes
    LED_INSTANCE ||--o| WARRANTY : covered_by
    ORDER ||--o{ DEVICE_RETURN : records
    LED_INSTANCE ||--o{ DEVICE_RETURN : is_returned

    USER ||--o{ CHARACTER : creates
    CHARACTER ||--|{ CHARACTER_VERSION : has
    STORE_LISTING ||--o{ CHARACTER_VERSION : publishes_versions
    USER ||--o{ USER_ENTITLEMENT : owns
    CHARACTER ||--o{ USER_ENTITLEMENT : grants
    USER ||--o{ STORE_LISTING : publishes
    STORE_LISTING ||--o{ LISTING_TAG : has
    TAG ||--o{ LISTING_TAG : assigned_to

    USER ||--|| CART : owns
    CART ||--o{ CART_ITEM : contains
    STORE_LISTING ||--o{ CART_ITEM : character_product
    LED_INSTANCE ||--o{ CART_ITEM : led_product

    USER ||--o{ ORDER : places
    USER_ADDRESS ||--o{ ORDER : selected_for
    ORDER ||--|{ ORDER_ITEM : contains
    STORE_LISTING ||--o{ ORDER_ITEM : character_product
    LED_INSTANCE ||--o{ ORDER_ITEM : led_product
    ORDER ||--o| DELIVERY : has

    USER ||--o{ PAYMENT_TRANSACTION : makes
    ORDER ||--o{ PAYMENT_TRANSACTION : paid_by
    COMMISSION ||--o{ PAYMENT_TRANSACTION : paid_by

    USER ||--o{ COMMISSION : submits
    USER ||--o{ COMMISSION : prices
    COMMISSION ||--o{ COMMISSION_SUBMISSION : has
    USER ||--o{ COMMISSION_SUBMISSION : submits
    COMMISSION ||--o{ COMMISSION_ASSIGNMENT : assigned
    USER ||--o{ COMMISSION_ASSIGNMENT : assigns

    COMMISSION_PRICE_CONFIG ||--o{ COMMISSION_PRICE_OPTION : has
    COMMISSION ||--o{ COMMISSION_CONFIG_SELECTION : selects
    COMMISSION_PRICE_OPTION ||--o{ COMMISSION_CONFIG_SELECTION : selected_in

    USER ||--o{ CONVERSATION_PARTICIPANT : participates
    CONVERSATION ||--o{ CONVERSATION_PARTICIPANT : has
    USER ||--o{ MESSAGE : sends
    CONVERSATION ||--o{ MESSAGE : contains

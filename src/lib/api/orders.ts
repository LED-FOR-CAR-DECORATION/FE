import type { ApiResponse } from '@/api_client';
import { request } from '@/api_client/core/request';
// Import từ ./client (không import thẳng từ '@/api_client') để đảm bảo
// BASE URL, WITH_CREDENTIALS và TOKEN đã được cấu hình trước khi gửi request.
import { OpenAPI } from './client';

// TODO: swagger.json hiện chỉ có các endpoint /api/auth/* nên codegen không sinh ra `OrderService`.
// Khi backend bổ sung endpoint order, chạy lại openapi-typescript-codegen và thay hàm dưới bằng
// `OrderService.<tênMethod>(...)`. Hiện tại gọi trực tiếp qua `request`.
const MY_ORDERS_URL = '/api/orders/my'; // TODO: đổi thành path thật của backend

// Khai báo các tham số phân trang cơ bản để sử dụng
export const fetchMyOrders = async (page: number = 0, size: number = 10): Promise<ApiResponse> => {
    return await request<ApiResponse>(OpenAPI, {
        method: 'GET',
        url: MY_ORDERS_URL,
        query: { page, size },
    });
};

import axios from "axios";
import i18n from "./i18n";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// 创建 axios 实例
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // 重要：自动包含 cookie
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加 token 或其他请求头
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    // 直接返回数据
    return response;
  },
  (error) => {
    // 处理错误
    if (error.response) {
      // 服务器返回了错误状态码
      const status = error.response.status;
      let message: string;

      // 后端可能返回字符串或 JSON 对象
      if (typeof error.response.data === "string") {
        message = error.response.data;
      } else if (error.response.data?.message) {
        message = error.response.data.message;
      } else {
        message = error.response.statusText || `请求失败: ${status}`;
      }

      if (status === 401) {
        // 未授权，跳转到登录页
        // 避免在登录页本身触发重定向
        if (window.location.hash !== "#/login") {
          window.location.hash = "#/login";
        }
        error.message = "UNAUTHORIZED";
      } else if (status === 409) {
        // 版本冲突
        error.message = i18n.t("axios.versionConflict");
      } else {
        error.message = message;
      }
    } else if (error.request) {
      error.message = i18n.t("axios.networkError");
    } else {
      error.message = error.message || i18n.t("axios.requestFailed");
    }

    return Promise.reject(error);
  }
);

export default apiClient;

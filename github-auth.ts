import { requestUrl } from "obsidian";

/**
 * GitHub OAuth Device Flow
 * 无需手动创建 Token，用户只需在浏览器中输入验证码即可登录
 *
 * 使用前需要在 GitHub 注册一个 OAuth App：
 * 1. 打开 https://github.com/settings/developers
 * 2. 点击 "New OAuth App"
 * 3. 填写任意信息，勾选 "Enable Device Flow"
 * 4. 记录 Client ID
 */

// 插件内置的 OAuth App Client ID
// 用户也可以在设置中填入自己的 Client ID
const DEFAULT_CLIENT_ID = "";

export interface DeviceFlowResult {
    success: boolean;
    token?: string;
    username?: string;
    error?: string;
}

/**
 * 启动 GitHub OAuth Device Flow 登录
 */
export async function startDeviceFlow(
    clientId: string,
    onCodeReady: (userCode: string, verificationUri: string) => void,
    onCancel?: () => void
): Promise<DeviceFlowResult> {
    const effectiveClientId = clientId || DEFAULT_CLIENT_ID;
    if (!effectiveClientId) {
        return {
            success: false,
            error: "请先在设置中填写 GitHub OAuth App 的 Client ID，或直接使用 Token 登录",
        };
    }

    try {
        // Step 1: 请求 device code
        const codeResp = await requestUrl({
            url: "https://github.com/login/device/code",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                client_id: effectiveClientId,
                scope: "repo",
            }),
        });

        const { device_code, user_code, verification_uri, expires_in, interval } =
            codeResp.json;

        // Step 2: 通知 UI 显示验证码
        onCodeReady(user_code, verification_uri);

        // Step 3: 轮询等待用户授权
        const startTime = Date.now();
        const timeout = (expires_in || 900) * 1000;
        let pollInterval = (interval || 5) * 1000;

        while (Date.now() - startTime < timeout) {
            // 等待间隔
            await new Promise<void>((resolve) => window.setTimeout(resolve, pollInterval));

            try {
                const tokenResp = await requestUrl({
                    url: "https://github.com/login/oauth/access_token",
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        client_id: effectiveClientId,
                        device_code: device_code,
                        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                    }),
                });

                const data = tokenResp.json;

                if (data.access_token) {
                    // 登录成功！获取用户名
                    const userResp = await requestUrl({
                        url: "https://api.github.com/user",
                        headers: {
                            Authorization: `Bearer ${data.access_token}`,
                            Accept: "application/vnd.github.v3+json",
                        },
                    });

                    return {
                        success: true,
                        token: data.access_token,
                        username: userResp.json.login,
                    };
                }

                if (data.error === "slow_down") {
                    pollInterval += 5000;
                } else if (data.error === "authorization_pending") {
                    // 继续等待
                } else if (
                    data.error === "expired_token" ||
                    data.error === "access_denied"
                ) {
                    return {
                        success: false,
                        error:
                            data.error === "access_denied"
                                ? "您拒绝了授权"
                                : "验证码已过期，请重试",
                    };
                }
            } catch {
                // 网络错误，继续重试
            }
        }

        return { success: false, error: "登录超时，请重试" };
    } catch (e) {
        return {
            success: false,
            error: `登录失败: ${e instanceof Error ? e.message : String(e)}`,
        };
    }
}

/**
 * 用 Token 验证 GitHub 登录状态
 */
export async function validateToken(
    token: string
): Promise<{ valid: boolean; username?: string }> {
    try {
        const resp = await requestUrl({
            url: "https://api.github.com/user",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
            },
        });
        return { valid: true, username: resp.json.login };
    } catch {
        return { valid: false };
    }
}

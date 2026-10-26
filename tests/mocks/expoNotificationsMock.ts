let scheduledList: Array<{
  identifier: string;
  content: { title: string; body: string; data?: Record<string, unknown> };
  trigger: unknown;
}> = [];

export async function requestPermissionsAsync() {
  return { status: 'granted', granted: true };
}

export async function getPermissionsAsync() {
  return { status: 'granted', granted: true };
}

export async function setNotificationHandler(handler: unknown) {
  return handler;
}

export async function scheduleNotificationAsync(request: {
  content: { title: string; body: string; data?: Record<string, unknown> };
  trigger: unknown;
}) {
  const identifier = `mock-notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  scheduledList.push({
    identifier,
    content: request.content,
    trigger: request.trigger,
  });
  return identifier;
}

export async function cancelScheduledNotificationAsync(identifier: string) {
  scheduledList = scheduledList.filter((item) => item.identifier !== identifier);
}

export async function getAllScheduledNotificationsAsync() {
  return [...scheduledList];
}

export async function cancelAllScheduledNotificationsAsync() {
  scheduledList = [];
}

export function __clearMockNotifications() {
  scheduledList = [];
}

export default {
  requestPermissionsAsync,
  getPermissionsAsync,
  setNotificationHandler,
  scheduleNotificationAsync,
  cancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync,
  cancelAllScheduledNotificationsAsync,
};

import { getAutoRunForOrigin, setAutoRunForOrigin } from "./settings.js";

export async function installAnnotationControls({
  origin,
  registerMenuCommand,
  unregisterMenuCommand,
  getValue,
  setValue,
  enable,
  disable,
  showStatus,
}) {
  let autoEnabled = await getAutoRunForOrigin(getValue, origin);
  let autoMenuId = null;
  let operation = 0;
  let persistenceQueue = Promise.resolve();

  const persist = (enabled) => {
    const write = persistenceQueue.then(() => setAutoRunForOrigin(setValue, enabled, origin));
    persistenceQueue = write.catch(() => {});
    return write;
  };

  const registerAutoMenu = () => {
    if (autoMenuId != null) {
      unregisterMenuCommand(autoMenuId);
    }
    autoMenuId = registerMenuCommand(
      `${autoEnabled ? "关闭" : "开启"}本网站自动标注`,
      async () => {
        const previousEnabled = autoEnabled;
        const requestedEnabled = !previousEnabled;
        const requestOperation = ++operation;
        autoEnabled = requestedEnabled;
        registerAutoMenu();
        if (!requestedEnabled) {
          disable();
        }

        try {
          await persist(requestedEnabled);
        } catch (error) {
          if (requestOperation === operation) {
            autoEnabled = previousEnabled;
            registerAutoMenu();
            if (requestedEnabled) {
              disable();
            }
            showStatus(`无法保存网站自动标注设置：${errorMessage(error)}`, {
              duration: 9000,
              error: true,
            });
          }
          return;
        }

        if (requestOperation !== operation || autoEnabled !== requestedEnabled) {
          return;
        }
        if (requestedEnabled) {
          await enable();
        }
      },
    );
  };

  registerAutoMenu();

  if (autoEnabled) {
    void enable();
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export {};
declare global {
  interface Window {
    createUnityInstance?: (
      canvas: HTMLCanvasElement,
      config: Record<string, unknown>,
      onProgress: (progress: number) => void,
    ) => Promise<{
      SendMessage: (
        object: string,
        method: string,
        value?: number | string,
      ) => void;
      Quit?: () => Promise<void>;
    }>;
    createPerformanceBridge?: (
      save: (
        completed: boolean,
        payload: Record<string, unknown>,
      ) => Promise<unknown>,
      sceneName: number,
      status: (message: string) => void,
    ) => {
      completeLevel: (payload: Record<string, unknown>) => Promise<unknown>;
      recordAttempt: (payload: Record<string, unknown>) => Promise<unknown>;
      retryPending: () => void;
      hasPending: () => boolean;
    };
    KnightCodeGame?:
      | {
          completeLevel: (payload: Record<string, unknown>) => Promise<unknown>;
          recordAttempt: (payload: Record<string, unknown>) => Promise<unknown>;
          retryPending: () => void;
          hasPending: () => boolean;
        }
      | undefined;
    KnightCodeStarterCode?:
      | {
          levelNumber: number;
          enabled: boolean;
          allowEditing: boolean;
          template: string;
        }
      | undefined;
    unityInstance?: {
      SendMessage: (
        object: string,
        method: string,
        value?: number | string,
      ) => void;
      Quit?: () => Promise<void>;
    };
  }
}

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[BrainBite]', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg p-8 font-sans text-slate-900">
          <h1 className="text-lg font-semibold">화면을 그리다가 오류가 났어요</h1>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-100 p-4 text-sm text-slate-800">
            {this.state.error.message}
          </pre>
          <p className="mt-4 text-sm text-slate-600">
            브라우저에서 <kbd className="rounded bg-slate-200 px-1">F12</kbd> → Console에 빨간 메시지가 있는지 확인한 뒤, 터미널의 Vite 로그도 함께 봐 주세요.
          </p>
          <button
            type="button"
            className="mt-6 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            onClick={() => window.location.reload()}
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

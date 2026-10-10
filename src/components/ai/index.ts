/**
 * Barrel dos componentes de IA/coach (terminal, chat, pipeline, payload).
 */
export {
  AiCallout,
  type AiActionItem,
  type AiCalloutAction,
  type AiCalloutProps,
} from './ai-callout';
export {
  AiCoachTerminal,
  type AiCoachTerminalProps,
} from './ai-coach-terminal';
export {
  AiQueryForm,
  type AiQueryFormProps,
} from './ai-query-form';
export {
  ChatInputBar,
  type ChatInputBarProps,
} from './chat-input-bar';
export {
  ChatMessage,
  type ChatMessageMeta,
  type ChatMessageProps,
} from './chat-message';
export {
  CodeViewer,
  type CodeViewerAction,
  type CodeViewerProps,
} from './code-viewer';
export {
  LayerTabs,
  type LayerTabOption,
  type LayerTabsProps,
} from './layer-tabs';
export {
  PipelineFlow,
  type PipelineFlowProps,
  type PipelineStage,
} from './pipeline-flow';
export {
  PipelineStepCard,
  type PipelineStepCardProps,
} from './pipeline-step-card';
export { tokenizeJson, type JsonToken, type JsonTokenKind } from './highlight';

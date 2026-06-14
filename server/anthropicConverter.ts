/**
 * Utility functions for translating between Anthropic Messages API and OpenAI Chat Completion API.
 */

export interface StreamState {
  messageStarted: boolean;
  messageStopped: boolean;
  activeContentIndex: number;
  activeBlockType: 'text' | 'tool_use' | null;
  toolCallIndexMap: Record<number, number>;
  id: string | null;
}

export function createInitialStreamState(): StreamState {
  return {
    messageStarted: false,
    messageStopped: false,
    activeContentIndex: -1,
    activeBlockType: null,
    toolCallIndexMap: {},
    id: null
  };
}

/**
 * Maps Anthropic's requests payload to OpenAI format.
 */
export function anthropicToOpenAIRequest(body: any, targetModel: string): any {
  const openaiMessages: any[] = [];

  // 1. Map System Prompt
  let systemContent = "";
  if (typeof body.system === "string") {
    systemContent = body.system;
  } else if (Array.isArray(body.system)) {
    systemContent = body.system
      .map((block: any) => {
        if (typeof block === "string") return block;
        if (block && block.type === "text") return block.text;
        return "";
      })
      .join("\n");
  }

  if (systemContent.trim().length > 0) {
    openaiMessages.push({
      role: "system",
      content: systemContent
    });
  }

  // 2. Map Messages Array
  if (Array.isArray(body.messages)) {
    for (const msg of body.messages) {
      const role = msg.role;
      const rawContent = msg.content;

      if (typeof rawContent === "string") {
        openaiMessages.push({
          role,
          content: rawContent
        });
      } else if (Array.isArray(rawContent)) {
        // If it's an array of blocks, we inspect them
        const textAndImageBlocks: any[] = [];
        const toolResultBlocks: any[] = [];

        for (const block of rawContent) {
          if (block && typeof block === "object") {
            if (block.type === "text") {
              textAndImageBlocks.push({
                type: "text",
                text: block.text
              });
            } else if (block.type === "image" && block.source) {
              const mediaType = block.source.media_type;
              const data = block.source.data;
              textAndImageBlocks.push({
                type: "image_url",
                image_url: {
                  url: `data:${mediaType};base64,${data}`
                }
              });
            } else if (block.type === "tool_result") {
              toolResultBlocks.push(block);
            } else if (block.type === "tool_use") {
              // Assistant tool_use block
              // Normally, assistant tool_use blocks are stored along with assistant role
              toolResultBlocks.push(block); // We will process tool_use below
            }
          }
        }

        // If there are tool_result blocks, we append them as separate role: "tool" messages in OpenAI
        if (toolResultBlocks.length > 0) {
          for (const block of toolResultBlocks) {
            if (block.type === "tool_result") {
              let contentString = "";
              if (typeof block.content === "string") {
                contentString = block.content;
              } else if (Array.isArray(block.content)) {
                contentString = block.content
                  .map((b: any) => (typeof b === "string" ? b : b?.text || ""))
                  .join("\n");
              } else {
                contentString = JSON.stringify(block.content || "");
              }

              openaiMessages.push({
                role: "tool",
                tool_call_id: block.tool_use_id,
                content: contentString
              });
            } else if (block.type === "tool_use") {
              // Assistant tool_use needs to be represented as an assistant message with tool_calls
              openaiMessages.push({
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: block.id,
                    type: "function",
                    function: {
                      name: block.name,
                      arguments: JSON.stringify(block.input || {})
                    }
                  }
                ]
              });
            }
          }
        }

        // If there are text/image blocks, add them as a single role message
        if (textAndImageBlocks.length > 0) {
          openaiMessages.push({
            role,
            content: textAndImageBlocks.length === 1 && textAndImageBlocks[0].type === "text"
              ? textAndImageBlocks[0].text
              : textAndImageBlocks
          });
        }
      }
    }
  }

  // 3. Map Tools
  let openaiTools: any[] | undefined = undefined;
  if (Array.isArray(body.tools) && body.tools.length > 0) {
    openaiTools = body.tools.map((tool: any) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description || "",
        parameters: tool.input_schema || { type: "object", properties: {} }
      }
    }));
  }

  // 4. Map Tool Choice
  let openaiToolChoice: any = undefined;
  if (body.tool_choice) {
    const type = body.tool_choice.type;
    if (type === "auto") {
      openaiToolChoice = "auto";
    } else if (type === "any") {
      openaiToolChoice = "required";
    } else if (type === "tool" && body.tool_choice.name) {
      openaiToolChoice = {
        type: "function",
        function: {
          name: body.tool_choice.name
        }
      };
    }
  }

  const result: any = {
    model: targetModel,
    messages: openaiMessages,
    temperature: body.temperature !== undefined ? body.temperature : 1.0,
    max_tokens: body.max_tokens || 4096,
    stream: !!body.stream
  };

  if (openaiTools) {
    result.tools = openaiTools;
  }
  if (openaiToolChoice) {
    result.tool_choice = openaiToolChoice;
  }

  if (body.stream) {
    result.stream_options = {
      include_usage: true
    };
  }

  return result;
}

/**
 * Maps OpenAI's response payload back to Anthropic format.
 */
export function openAIToAnthropicResponse(openaiData: any, requestedModel: string): any {
  const content: any[] = [];
  const choice = openaiData.choices?.[0];
  const message = choice?.message;

  if (message?.content) {
    content.push({
      type: "text",
      text: message.content
    });
  }

  if (Array.isArray(message?.tool_calls)) {
    for (const tc of message.tool_calls) {
      let parsedInput = {};
      try {
        parsedInput = JSON.parse(tc.function.arguments || "{}");
      } catch (e) {
        parsedInput = {};
      }

      content.push({
        type: "tool_use",
        id: tc.id || `call_${Math.random().toString(36).substring(2)}`,
        name: tc.function.name,
        input: parsedInput
      });
    }
  }

  const usage = {
    input_tokens: openaiData.usage?.prompt_tokens || 0,
    output_tokens: openaiData.usage?.completion_tokens || 0
  };

  let stop_reason = "end_turn";
  const finish_reason = choice?.finish_reason;
  if (finish_reason === "length") {
    stop_reason = "max_tokens";
  } else if (finish_reason === "tool_calls" || (Array.isArray(message?.tool_calls) && message.tool_calls.length > 0)) {
    stop_reason = "tool_use";
  }

  return {
    id: "msg_" + (openaiData.id || Math.random().toString(36).substring(2)),
    type: "message",
    role: "assistant",
    content: content,
    model: requestedModel,
    stop_reason: stop_reason,
    stop_sequence: null,
    usage: usage
  };
}

/**
 * Converts a single OpenAI stream chunk to one or more Anthropic stream events.
 */
export function openAIToAnthropicStreamChunk(
  chunk: any,
  state: StreamState,
  requestedModel: string,
  inputTokenCountEstimate: number = 0
): Array<{ event: string; data: any }> {
  const events: Array<{ event: string; data: any }> = [];
  const choice = chunk.choices?.[0];

  // 1. Handle starting the message if it hasn't been started
  if (!state.messageStarted) {
    state.id = state.id || "msg_" + (chunk.id || Math.random().toString(36).substring(2));
    state.messageStarted = true;
    events.push({
      event: "message_start",
      data: {
        type: "message_start",
        message: {
          id: state.id,
          type: "message",
          role: "assistant",
          content: [],
          model: requestedModel,
          stop_reason: null,
          stop_sequence: null,
          usage: {
            input_tokens: inputTokenCountEstimate || 0,
            output_tokens: 0
          }
        }
      }
    });
  }

  // Handle choice usage chunk (often final chunk contains usage)
  if (chunk.usage) {
    events.push({
      event: "message_delta",
      data: {
        type: "message_delta",
        delta: {
          stop_reason: "end_turn",
          stop_sequence: null
        },
        usage: {
          output_tokens: chunk.usage.completion_tokens || 0
        }
      }
    });
  }

  if (!choice) {
    return events;
  }

  const delta = choice.delta;
  const finish_reason = choice.finish_reason;

  if (delta) {
    // A. Handle text delta
    if (typeof delta.content === "string" && delta.content.length > 0) {
      if (state.activeBlockType !== "text") {
        if (state.activeContentIndex >= 0) {
          events.push({
            event: "content_block_stop",
            data: {
              type: "content_block_stop",
              index: state.activeContentIndex
            }
          });
        }
        state.activeContentIndex++;
        state.activeBlockType = "text";
        events.push({
          event: "content_block_start",
          data: {
            type: "content_block_start",
            index: state.activeContentIndex,
            content_block: {
              type: "text",
              text: ""
            }
          }
        });
      }

      events.push({
        event: "content_block_delta",
        data: {
          type: "content_block_delta",
          index: state.activeContentIndex,
          delta: {
            type: "text_delta",
            text: delta.content
          }
        }
      });
    }

    // B. Handle tool calls delta
    if (Array.isArray(delta.tool_calls)) {
      for (const tc of delta.tool_calls) {
        const toolIndex = tc.index ?? 0;

        if (state.toolCallIndexMap[toolIndex] === undefined) {
          if (state.activeContentIndex >= 0) {
            events.push({
              event: "content_block_stop",
              data: {
                type: "content_block_stop",
                index: state.activeContentIndex
              }
            });
          }

          state.activeContentIndex++;
          state.toolCallIndexMap[toolIndex] = state.activeContentIndex;
          state.activeBlockType = "tool_use";

          events.push({
            event: "content_block_start",
            data: {
              type: "content_block_start",
              index: state.activeContentIndex,
              content_block: {
                type: "tool_use",
                id: tc.id || `call_${Math.random().toString(36).substring(2)}`,
                name: tc.function?.name || "",
                input: {}
              }
            }
          });
        }

        const anthropicIndex = state.toolCallIndexMap[toolIndex];
        const partialJson = tc.function?.arguments;
        if (partialJson) {
          events.push({
            event: "content_block_delta",
            data: {
              type: "content_block_delta",
              index: anthropicIndex,
              delta: {
                type: "input_json_delta",
                partial_json: partialJson
              }
            }
          });
        }
      }
    }
  }

  // 2. Handle finish reason
  if (finish_reason) {
    if (state.activeContentIndex >= 0) {
      events.push({
        event: "content_block_stop",
        data: {
          type: "content_block_stop",
          index: state.activeContentIndex
        }
      });
      state.activeContentIndex = -1;
      state.activeBlockType = null;
    }

    let stop_reason = "end_turn";
    if (finish_reason === "length") {
      stop_reason = "max_tokens";
    } else if (finish_reason === "tool_calls") {
      stop_reason = "tool_use";
    }

    events.push({
      event: "message_delta",
      data: {
        type: "message_delta",
        delta: {
          stop_reason: stop_reason,
          stop_sequence: null
        },
        usage: {
          output_tokens: chunk.usage?.completion_tokens || 0
        }
      }
    });

    state.messageStopped = true;
    events.push({
      event: "message_stop",
      data: {
        type: "message_stop"
      }
    });
  }

  return events;
}

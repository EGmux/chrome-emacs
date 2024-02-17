import { Options, UpdateTextPayload } from '@/handlers/types';

/**
 * A base class for creating handlers that are injected into web pages.
 * These handlers communicate with the main application via postMessage.
 */
export default class BaseInjectedHandler<Elem extends Element> {
  elem: Elem;
  uuid: string;
  silenced: boolean = false;

  constructor(elem: Elem, uuid: string) {
    this.elem = elem;
    this.uuid = uuid;
  }
  /**
   * Sets up the handler, loading necessary resources and binding change events.
   */
  async setup(): Promise<void> {
    await this.load();
    this.bindChange(() => this.postToInjector('change'));
  }

  /**
   * Loads resources or performs initialization tasks. Designed to be overridden.
   */
  async load(): Promise<void> {}
  /**
   * Handles messages from the injector.
   *
   * @param data - The message data containing the type, uuid, and payload.
   */
  handleMessage(data: { type: string; uuid: string; payload: unknown }): void {
    if (data && data.type) {
      const methodName = `on${
        data.type.charAt(0).toUpperCase() + data.type.slice(1)
      }` as keyof this;

      if (
        data.uuid === this.uuid &&
        typeof (this as any)[methodName] === 'function'
      ) {
        (this as any)[methodName](data.payload);
      }
    }
  }
  /**
   * Handles 'getValue' messages by posting the current value to the injector.
   */
  onGetValue(): void {
    this.postToInjector('value', {
      text: this.getValue(),
    });
  }

  /**
   * Handles 'setValue' messages by setting the provided value.
   *
   * @param payload - The payload containing the text value to be set.
   */
  onSetValue(payload: { text: string }): void {
    this.setValue(payload.text, payload);
  }

  /**
   * Retrieves the value from the element. Must be implemented by subclasses.
   */
  getValue(): string {
    throw new Error('not implemented');
  }

  /**
   * Sets the value on the element. Must be implemented by subclasses.
   *
   * @param _value - The value to be set.
   */
  setValue(_value: string, _options?: UpdateTextPayload): void {
    throw new Error('not implemented');
  }
  /**
   * Binds a change event handler to the element. Must be implemented by subclasses.
   *
   * @param _handler - The handler to be executed on element changes.
   */
  bindChange(_handler: () => void): void {
    throw new Error('not implemented');
  }

  /**
   * Temporarily silences notifications to the injector within the provided function.
   *
   * @param f - The function to be executed silently.
   */
  executeSilenced(f: () => void): void {
    this.silenced = true;
    f();
    this.silenced = false;
  }

  /**
   * Posts a 'ready' message to the injector, optionally including extension data.
   */
  postReady(): void {
    const payload: Options = {};
    const extension = this.getExtension();

    if (extension) {
      payload.extension = extension;
    }
    this.postToInjector('ready', payload);
  }

  /**
   * Optionally returns data about the handler's capabilities. Designed to be overridden.
   */
  getExtension(): Options['extension'] | null | void {}

  /**
   * Wraps a function with a check that only allows execution if the handler is not silenced.
   *
   * @param f - The function to wrap.
   * @returns A wrapped function that checks for silence before execution.
   */
  wrapSilence(f: (...args: unknown[]) => void): (...args: unknown[]) => void {
    return (...args) => {
      if (!this.silenced) {
        f(...args);
      }
    };
  }

  /**
   * Posts a message to the injector.
   *
   * @param type - The type of the message.
   * @param payload - The message payload.
   */
  postToInjector(type: string, payload?: unknown): void {
    const message = {
      type: type,
      uuid: this.uuid,
      payload: payload || {},
    };
    window.postMessage(message, location.origin);
  }
}

import { render } from "preact";
import { StructuredMessageContainer } from "../chat/StructuredMessageContainer.tsx";

export class MessageTurnController {
  private userMounted = false;
  private modelMounted = false;

  constructor(private turnElement: HTMLElement) {}

  public processTurn() {
    const userHost = this.turnElement.querySelector('.custom-user-message-container') as HTMLElement | null;
    const modelHost = this.turnElement.querySelector('.custom-response-container') as HTMLElement | null;

    if (userHost && !this.userMounted) {
      render(<StructuredMessageContainer type="user" hostElement={userHost} />, userHost);
      this.userMounted = true;
    }

    if (modelHost && !this.modelMounted) {
      render(<StructuredMessageContainer type="model" hostElement={modelHost} />, modelHost);
      this.modelMounted = true;
    }
  }

  public unmountTurn() {
    const userHost = this.turnElement.querySelector('.custom-user-message-container');
    const modelHost = this.turnElement.querySelector('.custom-response-container');

    if (this.userMounted && userHost) {
      render(null, userHost);
      this.userMounted = false;
    }

    if (this.modelMounted && modelHost) {
      render(null, modelHost);
      this.modelMounted = false;
    }
  }
}

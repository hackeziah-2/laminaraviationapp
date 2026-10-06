/** @vitest-environment jsdom */
import { useState } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AutoResizeTextarea } from "./AutoResizeTextarea";
import { autoResizeTextarea } from "../../utils/autoResizeTextarea";

afterEach(() => {
  cleanup();
});

function mockScrollHeight(element: HTMLTextAreaElement, height: number) {
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    get: () => height,
  });
}

describe("autoResizeTextarea", () => {
  it("grows to the content height below the max", () => {
    const element = document.createElement("textarea");
    mockScrollHeight(element, 160);
    autoResizeTextarea(element, 300);
    expect(element.style.height).toBe("160px");
  });

  it("caps height at the maximum and keeps overflow scrollable", () => {
    const element = document.createElement("textarea");
    mockScrollHeight(element, 480);
    autoResizeTextarea(element, 300);
    expect(element.style.height).toBe("300px");
  });
});

describe("AutoResizeTextarea", () => {
  it("resizes when the value is loaded or pasted", () => {
    const { rerender, getByRole } = render(
      <AutoResizeTextarea value="short" onChange={() => undefined} />
    );
    const textarea = getByRole("textbox") as HTMLTextAreaElement;
    mockScrollHeight(textarea, 220);
    rerender(
      <AutoResizeTextarea
        value={"line 1\nline 2\nline 3"}
        onChange={() => undefined}
      />
    );
    expect(textarea.style.height).toBe("220px");
  });

  it("keeps the caret when height is recalculated during an edit", () => {
    const element = document.createElement("textarea");
    document.body.appendChild(element);
    element.value = "HELLO WORLD";
    element.focus();
    element.setSelectionRange(5, 5);
    mockScrollHeight(element, 160);
    autoResizeTextarea(element, 300);
    expect(element.selectionStart).toBe(5);
    expect(element.selectionEnd).toBe(5);
    element.remove();
  });

  it("inserts a character at the caret in the middle of a sentence", () => {
    function EchoArea() {
      const [value, setValue] = useState("HELLO WORLD");
      return (
        <AutoResizeTextarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      );
    }

    const { getByRole } = render(<EchoArea />);
    const textarea = getByRole("textbox") as HTMLTextAreaElement;
    textarea.focus();
    fireEvent.change(textarea, {
      target: {
        value: "HELLOX WORLD",
        selectionStart: 6,
        selectionEnd: 6,
      },
    });
    expect(textarea.value).toBe("HELLOX WORLD");
    expect(textarea.selectionStart).toBe(6);
    expect(textarea.selectionEnd).toBe(6);

    fireEvent.change(textarea, {
      target: {
        value: "HELLOXY WORLD",
        selectionStart: 7,
        selectionEnd: 7,
      },
    });
    expect(textarea.value).toBe("HELLOXY WORLD");
    expect(textarea.selectionStart).toBe(7);
    expect(textarea.selectionEnd).toBe(7);
  });

  it("resizes on input and does not allow manual resize", () => {
    const { getByRole } = render(
      <AutoResizeTextarea value="" onChange={() => undefined} />
    );
    const textarea = getByRole("textbox") as HTMLTextAreaElement;
    mockScrollHeight(textarea, 140);
    fireEvent.input(textarea, { target: { value: "pasted\nmultiline" } });
    expect(textarea.style.height).toBe("140px");
    expect(textarea.className).toContain("resize-none");
    expect(textarea.className).toContain("overflow-y-auto");
  });
});

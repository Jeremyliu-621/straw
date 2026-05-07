import { describe, it, expect } from "vitest";
import { scoreSeverity } from "./rich-submission-row";

describe("scoreSeverity", () => {
  it("classifies high scores", () => {
    expect(scoreSeverity(80).band).toBe("high");
    expect(scoreSeverity(95).band).toBe("high");
    expect(scoreSeverity(100).band).toBe("high");
  });

  it("classifies mid scores", () => {
    expect(scoreSeverity(50).band).toBe("mid");
    expect(scoreSeverity(72).band).toBe("mid");
    expect(scoreSeverity(79.9).band).toBe("mid");
  });

  it("classifies low scores", () => {
    expect(scoreSeverity(0).band).toBe("low");
    expect(scoreSeverity(49.9).band).toBe("low");
  });

  it("classifies null as none", () => {
    expect(scoreSeverity(null).band).toBe("none");
  });

  it("returns a non-empty color string for every band", () => {
    expect(scoreSeverity(90).color).toBeTruthy();
    expect(scoreSeverity(60).color).toBeTruthy();
    expect(scoreSeverity(30).color).toBeTruthy();
    expect(scoreSeverity(null).color).toBeTruthy();
  });
});

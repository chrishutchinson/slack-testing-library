import { delay } from "../delay";

describe("#delay()", () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it("should resolve after the given period of time", async () => {
    jest.useFakeTimers();

    // Recort the start time
    const start = Date.now();

    // Start the delay
    const promise = delay(1000);

    // Fast forward time
    jest.runAllTimers();

    // Await the resolved promise
    await promise;

    // Record the end time
    const end = Date.now();

    expect(end - start).toBe(1000);
  });
});

import { afterEach, expect, it, vi } from "vitest";
import { createAutosave } from "./autosave";
afterEach(() => vi.useRealTimers());
it("saves only the latest edit after typing settles", async () => {
 vi.useFakeTimers();
 const save=vi.fn(async (_value:number)=>{}), done=vi.fn();
 const autosave=createAutosave(save,done,vi.fn());
 autosave.schedule(4);autosave.schedule(6);
 await vi.advanceTimersByTimeAsync(350);
 expect(save.mock.calls).toEqual([[6]]);expect(done.mock.calls).toEqual([[6]]);
});
it("serializes overlapping changes and acknowledges only the final one", async () => {
 vi.useFakeTimers();let finish!:()=>void;
 const save=vi.fn((value:number)=>value===1 ? new Promise<void>(resolve=>{finish=resolve;}) : Promise.resolve());
 const done=vi.fn(), autosave=createAutosave(save,done,vi.fn());
 autosave.schedule(1);await vi.advanceTimersByTimeAsync(350);
 autosave.schedule(2);await vi.advanceTimersByTimeAsync(350);
 expect(save.mock.calls).toEqual([[1]]);
 finish();await vi.advanceTimersByTimeAsync(0);
 expect(save.mock.calls).toEqual([[1],[2]]);expect(done.mock.calls).toEqual([[2]]);
});
it("reports failures and can save subsequent edits", async () => {
 vi.useFakeTimers();const failure=new Error("offline"), error=vi.fn(), done=vi.fn();
 const save=vi.fn(async(value:number)=>{if(value===1) throw failure;});
 const autosave=createAutosave(save,done,error);
 autosave.schedule(1);await vi.advanceTimersByTimeAsync(350);expect(error).toHaveBeenCalledWith(failure);expect(done).not.toHaveBeenCalled();
 autosave.schedule(2);await vi.advanceTimersByTimeAsync(350);expect(done).toHaveBeenCalledWith(2);
});
it("cancels pending edits when the input is invalid or the form unmounts", async () => {
 vi.useFakeTimers();const save=vi.fn(async(_value:number)=>{}), autosave=createAutosave(save,vi.fn(),vi.fn());
 autosave.schedule(6);autosave.cancel();await vi.advanceTimersByTimeAsync(350);expect(save).not.toHaveBeenCalled();
});

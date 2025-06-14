const config = {
    host: "http://localhost:8080/",
    //host: "https://deliveroojs.onrender.com",
    // host: "https://deliveroojs2.rtibdi.disi.unitn.it/",

    tokens: [
        // "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImYwZDZlMyIsIm5hbWUiOiJiYXNzaSIsInRlYW1JZCI6ImViN2RmYyIsInRlYW1OYW1lIjoiQkFTU0lFTUEiLCJyb2xlIjoidXNlciIsImlhdCI6MTc0NjAwMDkwNn0.Q55YrwhQvVXHLW2z9BUwEAUt3D5gd6bjQrp4hEYKCUg", -- per testare con host unitn
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFiMTMyYzI0MGQxIiwibmFtZSI6Ik1VTFRJXzEiLCJpYXQiOjE3NDE3MDA4MDR9.Wiu4GXp9CRKPHYT-A0MdU4kj0I4sWUVMwPpBfVgHaLk",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImIxMzJjMjQwZDE5IiwibmFtZSI6Ik1VTFRJXzIiLCJpYXQiOjE3NDE3MDA4MDR9.qUs4S6z4K_a9T7A7cVhhibks8u3EZXI1RCOhvaESGyA",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEzMmMyNDBkMTlmIiwibmFtZSI6Ik1VTFRJXzMiLCJpYXQiOjE3NDE3MDA4MDR9.NaD9dh3b4i4lvLFiganeqlZKBq_lvOshXk_Hss_-mYI",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjMyYzI0MGQxOWZjIiwibmFtZSI6Ik1VTFRJXzQiLCJpYXQiOjE3NDE3MDA4MDR9.oMoqrM4x91mpQ0S7AWGpfG-334XtJP6v_dMFHSEI_Cw",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjJjMjQwZDE5ZmNhIiwibmFtZSI6Ik1VTFRJXzUiLCJpYXQiOjE3NDE3MDA4MDR9.5VbV2gBdo8RBimsfZZ-gY_ihjxqw4o1GiizUnfOTmeQ",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImMyNDBkMTlmY2EyIiwibmFtZSI6Ik1VTFRJXzYiLCJpYXQiOjE3NDE3MDA4MDR9.YSIfsS3Qvb-_vGrjm9Zh1o2T3aoRNH1ZyuQOQ2zkMxs",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjI0MGQxOWZjYTI2IiwibmFtZSI6Ik1VTFRJXzciLCJpYXQiOjE3NDE3MDA4MDR9.MPUSHkpm_u1FcnLPYdxZDp4EWzMRdK8kkOqG8WVzfHg",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQwZDE5ZmNhMjYzIiwibmFtZSI6Ik1VTFRJXzgiLCJpYXQiOjE3NDE3MDA4MDR9.IwFgaFe_YUZRXFRXHiU_Pn2bgtDlV9w53zRyUNJq8tY",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjBkMTlmY2EyNjNlIiwibmFtZSI6Ik1VTFRJXzkiLCJpYXQiOjE3NDE3MDA4MDR9.H5NV2ZhxI4BD1yPLQ1Gso0LBZcDbxvBVK6dhp5JKoRY",
    ],
};

/** Number of steps the agent takes towards the center during exploration. */
export const EXPLORATION_STEP_TOWARDS_CENTER = 2;

/** Time (in ms) to wait for an agent to move before proceeding. */
export const WAIT_FOR_AGENT_MOVE_ON = 1000;

/** Maximum number of retries when an agent is blocked. */
export const MAX_BLOCK_RETRIES = 3;

/** Weight factor in "linear" strategy for distance calculations. */
export const DISTANCE_WEIGHT = 1.5;

/** Weight factor in "linear" strategy for reward evaluation. */
export const REWARD_WEIGHT = 1;

/** Distance weight used in "aggressive" agent strategy (should be between 1.1 and 1.3). */
export const AGGRESSIVE_DISTANCE_WEIGHT = 1.17;

/** Reward weight used in "sophisticate" agent strategy (e.g., support agents). MUST BE IN (0,1) */
export const S_REWARD_WEIGHT = 0.7;

/** Distance weight used in "sophisticate" agent strategy (e.g., support agents). MUST BE IN (0,1) */
export const S_DISTANCE_WEIGHT = 0.5;

/** Maximum distance allowed for exploration behavior. */
export const MAX_DISTANCE_EXPLORATION = 30;

/** Delay between actions during testing (should be 0 for proper test behavior). */
export const TEST_DELAY_BETWEEN_ACTIONS = 0;

/** Timeout (in ms) for collaboration scenarios. */
export const COLLABORATION_TIMEOUT = 60000;

/** Random timeout range (in ms) for request handling. */
export const RESQUEST_TIMEOUT_RANGE = [0, 1000];

/** Exploration range (in units) for courier agents. */
export const COURIER_EXPLORATION_RANGE = 7;

/** Maximum number of log messages stored per agent. */
export const MAX_AGENT_LOGS = 4;

export default config;

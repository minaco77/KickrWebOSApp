module.exports = {
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.js"],
    include: ["tests/**/*.test.js"]
  }
};

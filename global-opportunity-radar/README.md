# Global Opportunity Radar

A multilingual AI opportunity radar that turns global science and technology signals into commercial concepts and Snapchat Lens ideas.

## Easy Lens workflow

1. Select an opportunity signal.
2. Choose **Turn into a Lens**.
3. Review or edit the English prompt generated for Snapchat Easy Lens.
4. Copy the prompt and open the official Easy Lens creator.
5. Review and publish from Snapchat.

The interface supports 26 major languages (Hebrew intentionally excluded). Easy Lens currently accepts English prompts, so the app keeps the creation prompt in English while localizing the workflow around it.

## Run locally

    npm install
    npm run dev

Open [Easy Lens by Snapchat](https://easylens.snapchat.com/).

## Integration boundary

Snapchat does not currently publish a public Easy Lens generation API for third-party websites. This project therefore implements the supported handoff: concept selection, optimized prompt generation, editing, copying, and opening Easy Lens. Full scene automation is available separately through Lens Studio's local MCP server.

# Contributing to CarbonLedger

## Architecture you must not break

The browser holds **no business logic**. It opens one Server-Sent Events connection and renders whatever the registry node pushes. Every user action is a POST; the server is the only thing that mutates state.

This is what makes every connected client see the identical registry at the identical moment. A pull request that computes scheme state client side breaks the guarantee, no matter how much faster it feels.

## The chain is real

Every emissions batch, MRV report, verification decision, issuance, trade and retirement is sealed into a block with SHA-256 plus proof of work, implemented from scratch. **Do not replace it with a crypto library.** The point is that the mechanism is readable end to end, and that tampering can be demonstrated live: rewrite a record, watch downstream blocks orphan, re-validate, watch the chain heal.

## Running it

    npm install
    npm run dev

Frontend on 5199, registry node on 8787.

## Roles

Industry, verifier and regulator share one registry. A change to one role usually has consequences for the other two. State in your pull request which roles you exercised.

## AI features

Verification recommendations, compliance briefs and the command palette are grounded in numbers computed server side. Do not let the model invent a figure that the registry did not produce.
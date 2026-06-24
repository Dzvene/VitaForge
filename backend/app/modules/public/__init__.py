"""Public, stateless preview slice.

Lets an unauthenticated guest run the real calculation engine (Norm/target,
weight trend, calibration estimate) against data they hold client-side — no
account, no persistence. Every endpoint here is pure: it takes the inputs in
the request body, calls `app.core.nutrition_math` with the default params, and
returns the result. Nothing touches the database.

This is what makes "look around without registering" honest: the guest sees the
engine's actual output, not a client-side reimplementation. When they register,
the frontend replays their local data to the authenticated slices.
"""

# Landing video and hackathon banner

The uploaded 2:22 product recording is stored at
`static/app_bch_flow/videos/bch-flow-demo.mp4`. It is remuxed with MP4 fast-start
without changing the recorded content or video quality. The recording has no audio
track. The landing plays it muted and loops inline; a keyboard-accessible button
opens the full recording in a native modal dialog with video controls. The preview
pauses while the dialog is open. A separate preview pause/resume button is available.
The full player loads only when opened. A local poster covers initial loading.

The top banner links to the user-supplied public source repository:
https://github.com/helijunior4545-glitch/bch-flow

Optional **public** Coolify environment variables (redeploy after changes):

- `FLOW_HACKATHON_PRESENTATION_URL`: HTTPS link to the completed presentation.
  Defaults to `https://painel.lojasnova.com.br/bch-flow/`, as requested by the owner.
  The landing URL does not establish completion of the required Widget Factory
  presentation. Replace it with the completed presentation link for that requirement.
- `FLOW_HACKATHON_TOKEN_ADDRESS`: the owner's public CashTokens receiving address
  for EMBER2026. Empty by default; the banner explicitly shows a pending label until
  configured. Verify that the address supports CashTokens before publishing it.
  No private keys, seed phrases or credentials belong in either variable.

No database migration is required. The normal deployment must run `collectstatic`
(already included in the container startup). The MP4 and poster ship with the app;
no video hosting service or additional API credentials are needed.

# First administrator bootstrap

The application has no default administrator account. Create the first account
once, from a trusted deployment shell with `DATABASE_URL` configured.

1. Generate a long, unique password in an approved password manager. Do not
   save it in the repository, shell history, deployment configuration, or a
   shared chat.
2. Prompt for the values without placing the password in shell history, then
   export them only for the bootstrap command:

   ```zsh
   read -r 'BOOTSTRAP_ADMIN_NAME?Administrator name: '
   read -r 'BOOTSTRAP_ADMIN_EMAIL?Administrator e-mail: '
   read -rs 'BOOTSTRAP_ADMIN_PASSWORD?Administrator password: '
   echo
   export BOOTSTRAP_ADMIN_NAME BOOTSTRAP_ADMIN_EMAIL BOOTSTRAP_ADMIN_PASSWORD
   bun run --cwd apps/api admin:bootstrap
   unset BOOTSTRAP_ADMIN_NAME BOOTSTRAP_ADMIN_EMAIL BOOTSTRAP_ADMIN_PASSWORD
   ```

3. Confirm the command reports that the administrator was created. Sign in at
   `POST /api/auth/admin/login` and store the password only in the password
   manager.

The command normalizes e-mail addresses, creates an Argon2id hash in the API,
and refuses to create an account when any administrator already exists. The
check and account creation run in a serializable database transaction so two
concurrent bootstrap attempts cannot both succeed. Use a separately reviewed
administrative procedure—not this bootstrap command—to reset a password or
create later administrator accounts.

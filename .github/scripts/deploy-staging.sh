#!/usr/bin/env bash
set -euo pipefail

: "${COOLIFY_URL:?Set COOLIFY_URL to the private Coolify dashboard URL}"
: "${COOLIFY_TOKEN:?Set the scoped COOLIFY_TOKEN secret}"
: "${COOLIFY_BACKEND_UUID:?Set COOLIFY_BACKEND_UUID to the staging API UUID}"
: "${COOLIFY_FRONTEND_UUID:?Set COOLIFY_FRONTEND_UUID to the staging web UUID}"
: "${STAGING_URL:?Set STAGING_URL to the staging frontend URL}"

if [[ ! "${GITHUB_SHA:-}" =~ ^[0-9a-f]{40}$ || "$COOLIFY_BACKEND_UUID" == "$COOLIFY_FRONTEND_UUID" ]]; then
  echo "Deployment requires a full Git commit SHA and two distinct application UUIDs." >&2
  exit 1
fi

api_url="${COOLIFY_URL%/}/api/v1"
staging_url="${STAGING_URL%/}"

coolify() {
  curl --silent --show-error --fail --max-time 30 \
    --header "Authorization: Bearer $COOLIFY_TOKEN" "$@"
}

deploy_app() {
  local name=$1 uuid=$2
  local response deployment_uuid status deadline

  echo "Deploying $name at $GITHUB_SHA."
  coolify --request PATCH \
    --json "$(jq -nc --arg sha "$GITHUB_SHA" '{git_commit_sha: $sha, instant_deploy: false}')" \
    "$api_url/applications/$uuid" >/dev/null

  # A previous Actions run may have stopped while Coolify was still deploying.
  response=$(coolify "$api_url/deployments/applications/$uuid")
  deployment_uuid=$(jq -r --arg sha "$GITHUB_SHA" '
    first(.deployments[] | select(
      .commit == $sha and .pull_request_id == 0 and (.status == "queued" or .status == "in_progress")
    ) | .deployment_uuid) // empty
  ' <<<"$response")

  if [[ -z "$deployment_uuid" ]]; then
    response=$(coolify --request POST \
      --json "$(jq -nc --arg uuid "$uuid" '{uuid: $uuid}')" \
      "$api_url/deploy")
    if ! deployment_uuid=$(jq -er --arg uuid "$uuid" \
      '.deployments[] | select(.resource_uuid == $uuid) | .deployment_uuid | strings | select(length > 0)' \
      <<<"$response"); then
      echo "Coolify did not return a deployment ID for $name." >&2
      return 1
    fi
  fi

  echo "Waiting for $name deployment $deployment_uuid."
  deadline=$((SECONDS + 900))
  while ((SECONDS < deadline)); do
    response=$(coolify "$api_url/deployments/$deployment_uuid")
    status=$(jq -er '.status' <<<"$response")
    case "$status" in
      finished)
        if ! jq -e --arg sha "$GITHUB_SHA" '.commit == $sha' <<<"$response" >/dev/null; then
          echo "$name deployment $deployment_uuid reported a different commit." >&2
          return 1
        fi
        return 0
        ;;
      queued|in_progress)
        sleep 10
        ;;
      *)
        echo "$name deployment $deployment_uuid ended with status $status." >&2
        return 1
        ;;
    esac
  done
  echo "Timed out waiting for $name deployment $deployment_uuid." >&2
  return 1
}

staging_request() {
  curl --silent --show-error --fail --location --max-time 15 \
    --retry 5 --retry-delay 3 --retry-all-errors "$staging_url$1"
}

for uuid in "$COOLIFY_BACKEND_UUID" "$COOLIFY_FRONTEND_UUID"; do
  application=$(coolify "$api_url/applications/$uuid")
  if ! jq -e '.git_branch == "Staging"' <<<"$application" >/dev/null; then
    echo "Coolify application $uuid must deploy from the Staging branch." >&2
    exit 1
  fi
done

deploy_app backend "$COOLIFY_BACKEND_UUID"
health=$(staging_request /api/health)
if [[ "$health" != Healthy ]]; then
  echo "The staging API health endpoint did not return Healthy." >&2
  exit 1
fi

deploy_app frontend "$COOLIFY_FRONTEND_UUID"
frontend=$(staging_request /)
health=$(staging_request /api/health)
if [[ "$frontend" != *'id="root"'* || "$health" != Healthy ]]; then
  echo "The staging frontend or API health check failed after deployment." >&2
  exit 1
fi

echo "Staging frontend and backend are ready at commit $GITHUB_SHA."

#!/bin/bash

set -e

zip_files=$(find . -name "archive*.zip")

for fname in $zip_files
do
  file=${fname%}
  rm "$file"
done

timestamp=$(date +%s)

zip "archive-$timestamp.zip" ./index.js ./package.json

sed -i '' -e '$ d' ../tf-gcp-infra/terraform.tfvars
echo "archive_name = \"archive-$timestamp.zip\"" >> ../tf-gcp-infra/terraform.tfvars


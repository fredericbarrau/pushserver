# Changelog

## 0.5.1
  * Upgrading mongoose & mongoose-paginate
  * Fix high CPU & memory usage for push to 1M+ devices ( [see. fix #006](https://github.com/fredericbarrau/pushserver/issues/6))


## 0.5.0
* Fixes feedback performance hit
* Handles GCM response : remove old tokens, update  token using canonical_ids

## 0.4.3
Initial NPM pushserver version

* Pushes notification to GCM and Android
* GUI
# Update place_asset table

```sql
INSERT INTO asset_place (place_id, asset_id) 
(SELECT p.cartodb_id AS place_id, a.cartodb_id AS asset_id 
FROM place p, assets_old a WHERE a.aoi = p.name)
```
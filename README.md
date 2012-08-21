# Update asset_place table

```sql
INSERT INTO asset_place (place_id, asset_id) 
(SELECT p.cartodb_id AS place_id, a.cartodb_id AS asset_id 
FROM place p, asset a WHERE a.place_name = p.name)
```
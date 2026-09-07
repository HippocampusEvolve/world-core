# Winter ecology, 7 September 2026

Reference packs inspected for silhouettes, proportions and motion vocabulary:

- Quaternius, **Ultimate Animated Animal Pack** (July 2021), CC0:
  https://quaternius.com/packs/ultimateanimatedanimals.html
  Fox and Deer glTF sources inspected. Fox has 53 nodes and 12 clips, Deer
  48 nodes and 13 clips. Their compact torsos, tapering muzzle, long deer legs,
  triangular fox ears and walk / watch / eating transitions informed the recipes.
- Kenney, **Nature Kit** (2020), CC0:
  https://kenney.nl/assets/nature-kit
  Downloaded original pack, inspected overview and plant silhouettes.
  Used as reference for readable clustered vegetation at low polygon counts.

Runtime geometry, vertex colours, branching, species variation, animation and
audio synthesis are original procedural implementations. No source mesh,
texture, animation clip or recorded sound is shipped or fetched by the game.
The raven silhouette and all generated sounds are original.

Animals use a small articulated rig, plants use spatial InstancedMesh batches,
and a fixed population avoids allocation during play. This is an interpretation
of the references, not an exact retopology or transfer of their animation rigs.

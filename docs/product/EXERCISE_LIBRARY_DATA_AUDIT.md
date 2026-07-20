# Exercise Library Data Audit

## Source Scope

The Phase 2 import audit validates the local exercise dataset as a development import source only. Production clients must use hosted HTTPS media URLs from the MoveInRange API and must never depend on local files.

## Verified Counts

| Metric | Count |
| --- | ---: |
| Exercise records | 1324 |
| Unique source IDs | 1324 |
| Duplicate source IDs | 0 |
| Duplicate names | 6 |
| Locales | 10 |
| English instruction gaps | 0 |
| Turkish instruction gaps | 0 |
| JPG thumbnails | 1324 |
| Animated GIFs | 1324 |
| Referenced JPGs with files | 1324 |
| Referenced GIFs with files | 1324 |
| Missing referenced files | 0 |
| Zero-byte files | 0 |
| Corrupt JPGs | 0 |
| Corrupt GIFs | 0 |
| Orphan JPGs | 0 |
| Orphan GIFs | 0 |
| Unsafe filenames | 0 |

## Media Measurements

| Media type | Files | Total size | Median file | P90 file | Max file |
| --- | ---: | ---: | ---: | ---: | ---: |
| JPG thumbnails | 1324 | 8,875,057 bytes | 6,582 bytes | 8,655 bytes | 11,118 bytes |
| GIF animations | 1324 | 128,741,397 bytes | 93,997 bytes | 128,250 bytes | 232,578 bytes |
| Combined | 2648 | 137,616,454 bytes | - | - | - |

All audited GIFs are 180 x 180. Frame counts range from 128 to 1175. Most GIFs are about three seconds, but one file reports a much longer duration and needs playback review before approval.

## Duplicate Names

The audit found six duplicate exercise names. Source IDs remain unique, so MoveInRange uses source IDs and internal exercise IDs for identity.

## License Finding

The dataset license text is ambiguous for public media redistribution. One section states the MIT terms cover media, while the media-specific exception text also states that cloning does not grant a media license. MoveInRange therefore keeps hosted JPG/GIF redistribution blocked until the media license is clarified. Local development validation and import tooling may proceed, but production API responses must not expose these assets as playable media until approval.

## Audit Tool

Run the deterministic audit locally:

```powershell
node scripts/audit-exercise-dataset.mjs --dataset-root "<dataset-root>" --output .local/exercise-import-audit.json --manifest .local/exercise-media-manifest.v1.json --source-version v1
```

The detailed report and manifest stay under `.local` and are not committed.

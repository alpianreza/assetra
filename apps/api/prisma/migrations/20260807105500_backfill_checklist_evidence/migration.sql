INSERT INTO `evidence` (`checklistLogId`, `inventoryId`, `fileName`, `storageKey`, `mimeType`, `sizeBytes`, `uploadedById`, `createdAt`)
SELECT
  cl.`id`,
  cl.`inventoryId`,
  cl.`photo`,
  CONCAT('checklist/', cl.`photo`),
  CASE
    WHEN LOWER(cl.`photo`) LIKE '%.png' THEN 'image/png'
    WHEN LOWER(cl.`photo`) LIKE '%.webp' THEN 'image/webp'
    ELSE 'image/jpeg'
  END,
  0,
  cl.`checkedById`,
  cl.`createdAt`
FROM `checklist_logs` cl
WHERE cl.`photo` IS NOT NULL
  AND TRIM(cl.`photo`) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM `evidence` e WHERE e.`checklistLogId` = cl.`id`
  );

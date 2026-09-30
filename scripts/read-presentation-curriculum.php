<?php
// One-way, read-only export used while rebuilding. It never writes to Aiven.
$private = 'C:/Users/Ryzen 3/KnightCodePresentationPrivate/web-connection.json';
$config = json_decode(file_get_contents($private), true, 32, JSON_THROW_ON_ERROR);
$pdo = new PDO('mysql:host='.$config['KC_DB_HOST'].';port='.$config['KC_DB_PORT'].';dbname='.$config['KC_DB_NAME'].';charset=utf8mb4', $config['KC_DB_USER'], $config['KC_DB_PASS'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::MYSQL_ATTR_SSL_CA=>$config['KC_DB_SSL_CA'], PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT=>true]);
$result=[];
foreach(['lessons','levels','achievements'] as $table) $result[$table]=$pdo->query('SELECT * FROM `'.$table.'` ORDER BY id')->fetchAll();
file_put_contents(__DIR__.'/../supabase/reference-curriculum.json', json_encode($result, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));
echo 'Exported curriculum reference without changing the source database.'.PHP_EOL;

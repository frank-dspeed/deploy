var fs = require("fs"),
	fsx = require("fs-extra"),
	mimeType = require("node-mime"),
	q = require("q");
	AWS = require("aws-sdk"),
	S3 = new AWS.S3({apiVersion: "2006-03-01"});

module.exports = {
	properties: [{
		name: "bucket",
		desc: "The name of your S3 bucket"
	}, {
		name: "config-path",
		desc: "Relative path to the file containing the object: "
			+ "{accessKeyId, secretAccessKey}."
	}],

	deploy: function(options, files, error) {
		var bucketExists = function(bucketName) {
			console.log("Checking for the existence of " + bucketName);

			var deferred = q.defer();
			S3.headBucket({
				Bucket: bucketName
			}, function(err, resp) {
				if (err) return deferred.reject(err);
				deferred.resolve(true);
			});
			return deferred.promise;
		};

		var createBucket = function(bucketName) {
			console.log("Bucket not found. Creating bucket " + bucketName);

			var deferred = q.defer();
			S3.createBucket({
				Bucket: bucketName
			}, function(err, resp) {
				if (err) return deferred.reject(err);
				deferred.resolve(bucketName);
			});
			return deferred.promise;
		};

		var uploadFile = function(path, bucket) {
			S3.putObject({
				ACL: "public-read",
				Bucket: bucket,
				Key: path,
				Body: fs.readFileSync(path),
				ContentType: mimeType.lookup(path)
			}, function(err, data) {
				if (err) { error(err); }
				console.log("Uploaded: " + path);
			});
		};

		var uploadFiles = function(files, bucket) {
			files.forEach(function(file) {
				uploadFile(file, bucket);
			});
		};

		try {
			AWS.config.loadFromPath(options["config-path"]);
		} catch (e) {
			error(e.message);
		}

		var bucket = options["bucket"];
		bucketExists(bucket).then(function(value){
			uploadFiles(files, bucket);
		}, function(err) {
			console.log(err);
			createBucket(options["bucket"]).then(function(value) {
				uploadFiles(files, bucket);
			}, function(err) {
				error(err);
			});
		});
	}
}

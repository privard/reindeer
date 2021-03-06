/*eslint no-magic-numbers:0*/
/*eslint no-unused-expressions:0*/
var
	chai = require('chai'),
	should = chai.should(),
	uuid = require('uuid'),

	Mapper = require('../../lib/mapper.js'),
	catsMapping = require('../cats-mapping.json');


describe('mapper', function () {
	'use strict';

	var
		catsMapper = new Mapper({
				_index : 'test-index',
				_type : 'test-type'
			},
			catsMapping),
		blue = {
			animalId : uuid.v4().replace(/\-/g, ''),
			breed : 'Domestic Shorthair',
			name : 'Blue'
		},
		cooper = {
			animalId : uuid.v4().replace(/\-/g, ''),
			breed : 'Domestic Shorthair',
			name : 'Cooper'
		},
		dugald = {
			breed : 'Siamese',
			name : 'Dugald',
			attributes : {
				height: 8.7,
				weight : 21.2
			}
		},
		hamish = {
			animalId : uuid.v4().replace(/\-/g, ''),
			breed : 'Manx',
			name : 'Hamish'
		},
		keelin = {
			animalId : uuid.v4().replace(/\-/g, ''),
			breed : 'Unknown - longhair',
			name : 'Keelin',
			randomField : 'random data',
			randomNestedField : {
				randomData: 'random data'
			}
		};

	after(function (done) {
		return catsMapper._client.indices.deleteIndex(done);
	});

	describe('#bulkCreate', function () {
		it('should properly create in bulk', function (done) {
			var
				docList = [blue, cooper, hamish, keelin],
				esIdList,
				idList = docList.map(function (cat) {
					return cat.animalId;
				});

			catsMapper.on('identity', (ids) => (esIdList = ids));

			catsMapper.bulkCreate(idList, docList, function (err, result) {
				should.not.exist(err);
				should.exist(result);
				should.not.exist(esIdList);
				result.should.have.length(4);
				should.exist(result[0]);
				should.exist(result[1]);
				should.exist(result[2]);
				should.exist(result[3]);

				catsMapper.get(keelin.animalId, function (err, catModel) {
					should.not.exist(err);
					should.exist(catModel);
					should.exist(catModel.name);
					catModel.name.should.equal('Keelin');

					return done();
				});
			});
		});

		it('should properly error when bulk creating documents that already exist', function (done) {
			var
				docList = [hamish, keelin],
				idList = docList.map(function (cat) {
					return cat.animalId;
				});

			catsMapper.bulkCreate(idList, docList)
				.then((err, result) => {
					should.exist(err);
					should.not.exist(result);
					should.exist(err.statusCode);
					err.statusCode.should.equal(409);

					return done();
				})
				.catch((err) => {
					should.exist(err);
					return done();
				});
		});

		it('should properly create in bulk without ids', function (done) {
			var
				docList = [
					JSON.parse(JSON.stringify(hamish)),
					JSON.parse(JSON.stringify(keelin)),
					JSON.parse(JSON.stringify(dugald))
				],
				esIdList;

			delete docList[0].animalId;
			delete docList[1].animalId;

			catsMapper.on('identity', (ids) => (esIdList = ids));

			catsMapper.bulkCreate(docList)
				.then((result) => {
					should.exist(result);
					should.exist(esIdList);
					should.exist(result[0]);
					should.exist(result[1]);
					esIdList.should.have.length(3);

					return done();
				})
				.catch(done);
		});
	});

	describe('#bulkGet', function () {
		it('should properly get in bulk', function (done) {
			var idList = [hamish, keelin].map(function (cat) {
				return cat.animalId;
			});

			catsMapper.bulkGet(idList)
				.then((catModels) => {
					should.exist(catModels);
					catModels.should.have.length(2);
					catModels[0].name.should.equal(hamish.name);

					return done();
				})
				.catch(done);
		});

		it('should properly get in bulk with _source parameter', function (done) {
			var idList = [hamish, keelin].map(function (cat) {
				return cat.animalId;
			});

			catsMapper.bulkGet(idList, ['name'], function (err, catModels) {
				should.not.exist(err);
				should.exist(catModels);
				catModels.should.have.length(2);
				Object.keys(catModels[0]).should.have.length(1);
				Object.keys(catModels[1]).should.have.length(1);

				return done();
			});
		});

		it('should properly return empty array when no results are found', function (done) {
			catsMapper.bulkGet(['not-valid-id-1', 'not-valid-id-2'], function (err, catModels) {
				should.not.exist(err);
				should.exist(catModels);
				catModels.should.have.length(0);

				return done();
			});
		});
	});

	describe('#bulkUpdate', function () {
		it('should not update documents that do not exist, in bulk', function (done) {
			var
				docList = [
					JSON.parse(JSON.stringify(hamish)),
					JSON.parse(JSON.stringify(keelin))
				],
				idList = docList.map(function (cat, i) {
					return ['not-valid-id', i].join('-');
				});

			docList[0].attributes = {
				height: 8.6,
				weight : 16.1
			};

			docList[1].attributes = {
				height: 6.2,
				weight : 14.7
			};

			catsMapper.bulkUpdate(idList, docList, function (err, result) {
				should.exist(err);
				should.not.exist(result);
				should.exist(err.statusCode);
				err.statusCode.should.equal(404);

				return done();
			});
		});

		it('should update documents in bulk', function (done) {
			var
				docList = [
					JSON.parse(JSON.stringify(hamish)),
					JSON.parse(JSON.stringify(keelin))
				],
				idList = docList.map(function (cat) {
					return cat.animalId;
				});

			docList[0].attributes = {
				height: 8.6,
				weight : 16.1
			};

			docList[1].attributes = {
				height: 6.2,
				weight : 14.7
			};

			catsMapper.bulkUpdate(idList, docList, function (err, result) {
				should.not.exist(err);
				should.exist(result);

				result.should.have.length(2);
				should.exist(result[0]);
				should.exist(result[1]);

				catsMapper.get(keelin.animalId, function (err, catModel) {
					should.not.exist(err);
					should.exist(catModel);
					should.exist(catModel.name);
					should.exist(catModel.attributes);
					should.exist(catModel.attributes.height);
					catModel.name.should.equal('Keelin');
					catModel.attributes.height.should.equal(6.2);

					return done();
				});
			});
		});
	});

	describe('#bulkUpsert', function () {
		it('should upsert documents in bulk', function (done) {
			var
				docList = [
					JSON.parse(JSON.stringify(hamish)),
					JSON.parse(JSON.stringify(keelin))
				],
				idList = docList.map(function (cat) {
					return cat.name;
				});

			catsMapper.bulkUpsert(idList, docList)
				.then((result) => {
					should.exist(result);

					result.should.have.length(2);
					should.exist(result[0]);
					should.exist(result[1]);

					catsMapper.get(keelin.name, function (err, catModel) {
						should.not.exist(err);
						should.exist(catModel);
						should.exist(catModel.name);

						return done();
					});
				})
				.catch(done);
		});
	});

	describe('#search', function () {
		it('should properly search', function (done) {
			var
				query = {
					from : 0,
					query : {
						'match_all' : {}
					},
					size : 500
				},
				summary;

			catsMapper.on('summary', (searchSummary) => (summary = searchSummary));

			catsMapper.search(query, function (err, catModels) {
				should.not.exist(err);
				should.exist(catModels);
				should.exist(summary);
				should.exist(summary.total);
				catModels.should.have.length(summary.total);

				return done();
			});
		});
	});

	describe('#bulkDelete', function () {
		it('should properly delete in bulk', function (done) {
			catsMapper.bulkDelete([hamish.animalId, keelin.animalId], function (err) {
				should.not.exist(err);

				catsMapper.get(hamish.animalId)
					.then((retrievedDoc) => {
						should.not.exist(retrievedDoc);

						catsMapper.get(blue.animalId, function (err, retrievedDoc) {
							should.not.exist(err);
							should.exist(retrievedDoc);

							return done();
						});
					})
					.catch(done);
			});
		});
	});

	describe('#create', function () {
		it('should properly create', function (done) {
			var _id;

			catsMapper.on('identity', (id) => (_id = id));

			catsMapper.create(hamish.animalId, hamish, function (err, insertedDoc) {
				should.not.exist(err);
				should.exist(insertedDoc);
				should.not.exist(_id);

				insertedDoc.animalId.should.equal(hamish.animalId);
				insertedDoc.breed.should.equal(hamish.breed);
				insertedDoc.name.should.equal(hamish.name);

				return done();
			});
		});

		it('should properly create without _id', function (done) {
			var _id;

			catsMapper.on('identity', (id) => (_id = id));

			catsMapper.create(dugald)
				.then((createdDoc) => {
					should.exist(createdDoc);
					should.exist(_id);

					should.not.exist(dugald.animalId);
					createdDoc.breed.should.equal(dugald.breed);
					createdDoc.name.should.equal(dugald.name);

					// assign _id for later
					dugald.animalId = _id;

					return done();
				})
				.catch(done);
		});

		it('should properly create and obey dynamic=false mapping', function (done) {
			catsMapper.create(keelin.animalId, keelin, function (err, insertedDoc) {
				should.not.exist(err);
				should.exist(insertedDoc);

				insertedDoc.animalId.should.equal(keelin.animalId);
				insertedDoc.breed.should.equal(keelin.breed);
				insertedDoc.name.should.equal(keelin.name);
				should.not.exist(insertedDoc.randomField);
				should.not.exist(insertedDoc.randomNestedField.randomData);

				return done();
			});
		});

		it('should properly require fields', function (done) {
			catsMapper.create({ breed : 'domestic shorthair' }, function (err, insertedDoc, animalId) {
				should.exist(err);
				should.not.exist(insertedDoc);
				should.not.exist(animalId);

				return done();
			});
		});

		it('should return error if document already exists', function (done) {
			catsMapper.create(hamish.animalId, hamish, function (err, insertedDoc) {
				should.exist(err);
				should.not.exist(insertedDoc);

				return done();
			});
		});
	});

	describe('#delete', function () {
		it('should properly delete a newly created doc', function (done) {
			catsMapper.delete(dugald.animalId)
				.then(() => {
					catsMapper.get(dugald.animalId, function (err, retrievedDoc) {
						should.not.exist(err);
						should.not.exist(retrievedDoc);

						return done();
					});
				})
				.catch(done);
		});

		/* Elasticsearch has removed deleteByQuery functionality in the core and moved capability to a plugin */
		/* https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-delete-by-query.html */

		/*
		it('should properly delete by query', function (done) {
			var options = {
				query : {
					match : {
						breed : blue.breed
					}
				}
			};

			// give it time for the documents to propegate across shards
			setTimeout(function () {
				catsMapper.search(options, function (err, foundCats) {
					should.not.exist(err);
					should.exist(foundCats);

					catsMapper.delete(options, function (err, summary) {
						should.not.exist(err);
						should.exist(summary);

						catsMapper.get(blue.animalId, function (err, retrievedDoc) {
							should.not.exist(err);
							should.not.exist(retrievedDoc);

							return done();
						});
					});
				});
			}, 1000);
		});*/
	});

	describe('#get', function () {
		it('should properly retrieve', function (done) {
			catsMapper.get(hamish.animalId, function (err, retrievedDoc) {
				should.not.exist(err);
				should.exist(retrievedDoc);

				retrievedDoc.animalId.should.equal(hamish.animalId);
				retrievedDoc.breed.should.equal(hamish.breed);
				retrievedDoc.name.should.equal(hamish.name);

				return done();
			});
		});

		it('should properly return nothing when not found', function (done) {
			catsMapper.get('doc-not-exists', function (err, retrievedDoc) {
				should.not.exist(err);
				should.not.exist(retrievedDoc);

				return done();
			});
		});

		it('should properly handle _source parameter', function (done) {
			catsMapper.update(
				keelin.animalId,
				{
					attributes : {
						height: 8.7,
						weight : 21.2
					}
				},
				function (err) {
					should.not.exist(err);

					catsMapper.get(
						keelin.animalId,
						['animalId', 'breed', 'name'],
						function (err, partialDoc) {
							should.not.exist(err);
							should.exist(partialDoc);
							Object.keys(partialDoc).should.have.length(3);

							return done();
						});
				});
		});
	});

	describe('#update', function () {
		it('should properly update a doc', function (done) {
			keelin.breed = 'Russian Blue';
			catsMapper.update(keelin.animalId, keelin, function (err, updatedDoc) {
				should.not.exist(err);
				should.exist(updatedDoc);

				updatedDoc.animalId.should.equal(keelin.animalId);
				updatedDoc.breed.should.equal(keelin.breed);
				updatedDoc.name.should.equal(keelin.name);

				return done();
			});
		});

		it('should return an error when attempting to update a non-existent doc', function (done) {
			dugald.name = 'Dugald the big cat';

			catsMapper.update('no-matching-id', dugald)
				.then(() => done(new Error('should return error when attempting to update a non-existent doc')))
				.catch((err) => {
					should.exist(err);

					return done();
				});
		});
	});

	describe('#upsert', function () {
		it('should properly error when Id is not supplied and the document does not exist', function (done) {
			catsMapper.upsert(dugald, function (err, upsertedDoc) {
				should.exist(err);
				should.not.exist(upsertedDoc);

				return done();
			});
		});

		it('should properly create if the document does not exist', function (done) {
			dugald.animalId = uuid.v4().replace(/\-/g, '');

			catsMapper.upsert(dugald.animalId, dugald)
				.then((upsertedDoc) => {
					should.exist(upsertedDoc);

					return done();
				})
				.catch(done);
		});

		it('should properly create if the document contains fields not contained in mapping', function (done) {
			keelin.animalId = uuid.v4().replace(/\-/g, '');

			catsMapper.upsert(keelin.animalId, keelin, function (err, upsertedDoc) {
				should.not.exist(err);
				should.exist(upsertedDoc);
				should.not.exist(upsertedDoc.randomField);
				should.not.exist(upsertedDoc.randomNestedField.randomData);

				return done();
			});
		});
	});
});

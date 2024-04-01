const express = require('express');
const newController = require('../controller/newController');
const blogController = require('../controller/blogController');
const commentController = require('../controller/commentController');
const auth = require('../middlewares/new');

const router = express.Router();



router.post('/register', newController.register);

router.post('/login', newController.login);

router.post('/logout',auth, newController.logout);

router.get('/refresh',newController.refresh);

router.post('/blog',auth,blogController.create);
router.get('/blog/all', auth , blogController.getAll);
router.get('/blog/:id',auth,blogController.getById);
router.put('/blog',auth,blogController.update);
router.delete('/blog/:id',auth,blogController.delete);
router.post('/comment',auth,commentController.create);
router.get('/comment',auth,commentController.getById);


module.exports = router;

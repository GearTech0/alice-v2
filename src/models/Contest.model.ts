import mongoose from 'mongoose';

let ContestSchema = new mongoose.Schema({
    active: String,
    channelName: String,
    channelId: String,
    messageId: String
});

let Contest = mongoose.model('Contest', ContestSchema);

export { Contest }

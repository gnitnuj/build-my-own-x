class CreatePosts < ActiveRecord::Migration[8.1]
  def change
    create_table :posts do |t|
      t.string :title
      t.text :description
      t.string :tumbnail_url
      t.boolean :pro

      t.timestamps
    end
  end
end
